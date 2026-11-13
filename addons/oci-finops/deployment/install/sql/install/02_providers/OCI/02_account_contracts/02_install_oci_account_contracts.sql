-- One OCI extension; two independent syncs. Run as FOCUSPLATFORM from deployment/sql/install.
SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK ON SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 190 PAGESIZE 100
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

PROMPT OCI ACCOUNT CONTEXT AND CONTRACT INSTALLATION

DECLARE
  L_CORE NUMBER;
  L_EXISTING NUMBER;
  L_FIRST_ATTEMPT NUMBER;
  L_SOURCE_ROWS NUMBER;
  L_RUN_ROWS NUMBER;
  L_ENTITY_ROWS NUMBER;
BEGIN
  IF SYS_CONTEXT('USERENV','SESSION_USER')<>'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20700,'Connect as FOCUSPLATFORM');
  END IF;
  SELECT COUNT(*) INTO L_CORE FROM USER_OBJECTS
   WHERE OBJECT_NAME='FINOPS_CORE_RUN_DAILY' AND STATUS='VALID';
  SELECT COUNT(*) INTO L_EXISTING FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'OCI_ACCOUNT_%'
      OR OBJECT_NAME IN ('OCI_SYNC_ACCOUNT_CONTEXT','OCI_SYNC_CONTRACT',
                         'OCI_SYNC_ALL_CONTRACTS');
  IF L_CORE<>1 THEN
    RAISE_APPLICATION_ERROR(-20701,
      'Install common core first');
  END IF;
  IF L_EXISTING>0 THEN
    -- The first operator attempt stopped at the context-health view.
    -- Accept only its exact empty footprint; never reset a populated module.
    SELECT COUNT(*) INTO L_FIRST_ATTEMPT FROM USER_OBJECTS
     WHERE (OBJECT_TYPE='TABLE' AND OBJECT_NAME IN
              ('OCI_ACCOUNT_SOURCE','OCI_ACCOUNT_CONTEXT_RUN','OCI_ACCOUNT_ENTITY'))
        OR (OBJECT_TYPE='INDEX' AND OBJECT_NAME IN
              ('OCI_ACCOUNT_ENTITY_CURRENT_UX','OCI_ACCOUNT_ENTITY_PARENT_IX'))
        OR (OBJECT_TYPE='VIEW' AND OBJECT_NAME IN
              ('OCI_ACCOUNT_CURRENT_V','OCI_ACCOUNT_COMPARTMENT_V',
               'OCI_ACCOUNT_REGION_V'));
    IF L_EXISTING<>8 OR L_FIRST_ATTEMPT<>8 THEN
      RAISE_APPLICATION_ERROR(-20701,
        'Unexpected account objects exist; inspect before installation');
    END IF;
    EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM OCI_ACCOUNT_SOURCE'
      INTO L_SOURCE_ROWS;
    EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM OCI_ACCOUNT_CONTEXT_RUN'
      INTO L_RUN_ROWS;
    EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM OCI_ACCOUNT_ENTITY'
      INTO L_ENTITY_ROWS;
    IF L_SOURCE_ROWS<>0 OR L_RUN_ROWS<>0 OR L_ENTITY_ROWS<>0 THEN
      RAISE_APPLICATION_ERROR(-20701,
        'Account tables contain rows; automatic cleanup is refused');
    END IF;
    EXECUTE IMMEDIATE 'DROP VIEW OCI_ACCOUNT_REGION_V';
    EXECUTE IMMEDIATE 'DROP VIEW OCI_ACCOUNT_COMPARTMENT_V';
    EXECUTE IMMEDIATE 'DROP VIEW OCI_ACCOUNT_CURRENT_V';
    EXECUTE IMMEDIATE 'DROP TABLE OCI_ACCOUNT_ENTITY PURGE';
    EXECUTE IMMEDIATE 'DROP TABLE OCI_ACCOUNT_CONTEXT_RUN PURGE';
    EXECUTE IMMEDIATE 'DROP TABLE OCI_ACCOUNT_SOURCE PURGE';
    DBMS_OUTPUT.PUT_LINE('Empty first-attempt account objects removed safely');
  END IF;
  DBMS_OUTPUT.PUT_LINE('Core and clean account module preflight passed');
END;
/

-- Test both Identity context and commercial-subscription access before DDL.
@02_providers/OCI/02_account_contracts/internal/00_preflight_oci_account_source.sql

@02_providers/OCI/02_account_contracts/internal/01_create_oci_account_storage.sql

INSERT INTO OCI_ACCOUNT_SOURCE(CONFIG_ID,TENANCY_OCID,HOME_REGION)
VALUES(1,:source_tenancy_ocid,:source_home_region);
COMMIT;

@02_providers/OCI/02_account_contracts/internal/02_create_oci_contract_storage.sql
@02_providers/OCI/02_account_contracts/internal/03_create_oci_context_sync.sql
@02_providers/OCI/02_account_contracts/internal/04_create_oci_contract_sync.sql
@02_providers/OCI/02_account_contracts/internal/05_create_oci_contract_discovery.sql

DECLARE
  L_VALID NUMBER;
  L_INVALID NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_VALID FROM USER_OBJECTS
   WHERE OBJECT_NAME IN ('OCI_SYNC_ACCOUNT_CONTEXT','OCI_SYNC_CONTRACT',
                         'OCI_SYNC_ALL_CONTRACTS')
     AND OBJECT_TYPE='PROCEDURE' AND STATUS='VALID';
  SELECT COUNT(*) INTO L_INVALID FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'OCI_ACCOUNT_%' AND STATUS<>'VALID';
  IF L_VALID<>3 OR L_INVALID<>0 THEN
    RAISE_APPLICATION_ERROR(-20702,
      'OCI account or contract code did not compile; inspect USER_ERRORS');
  END IF;
  DBMS_OUTPUT.PUT_LINE('OCI account and contract compilation gate passed');
END;
/

BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    JOB_NAME=>'OCI_ACCOUNT_CONTEXT_DAILY',
    JOB_TYPE=>'STORED_PROCEDURE',
    JOB_ACTION=>'OCI_SYNC_ACCOUNT_CONTEXT',
    START_DATE=>FINOPS_CORE_SCHEDULE_API.LOCAL_START_DATE(),
    REPEAT_INTERVAL=>'FREQ=DAILY;BYHOUR=01;BYMINUTE=00;BYSECOND=00',
    ENABLED=>TRUE,
    COMMENTS=>'Daily OCI tenancy, compartment and region context');
  DBMS_SCHEDULER.CREATE_JOB(
    JOB_NAME=>'OCI_ACCOUNT_CONTRACT_MONTHLY',
    JOB_TYPE=>'STORED_PROCEDURE',
    JOB_ACTION=>'OCI_SYNC_ALL_CONTRACTS',
    START_DATE=>FINOPS_CORE_SCHEDULE_API.LOCAL_START_DATE(),
    REPEAT_INTERVAL=>'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=04;BYMINUTE=45;BYSECOND=00',
    ENABLED=>TRUE,
    COMMENTS=>'Monthly commercial subscriptions, services and commitments');
  DBMS_OUTPUT.PUT_LINE('Independent daily and monthly jobs enabled');
END;
/

@02_providers/OCI/02_account_contracts/verify/02_verify_oci_account_contracts.sql

BEGIN
  DBMS_SCHEDULER.RUN_JOB('OCI_ACCOUNT_CONTEXT_DAILY',USE_CURRENT_SESSION=>FALSE);
  DBMS_SCHEDULER.RUN_JOB('OCI_ACCOUNT_CONTRACT_MONTHLY',USE_CURRENT_SESSION=>FALSE);
  DBMS_OUTPUT.PUT_LINE('Initial context and contract syncs requested in background');
END;
/

DECLARE
  L_FINISHED_JOBS NUMBER;
BEGIN
  FOR I IN 1..12 LOOP
    SELECT COUNT(DISTINCT JOB_NAME) INTO L_FINISHED_JOBS
      FROM USER_SCHEDULER_JOB_RUN_DETAILS
     WHERE JOB_NAME IN ('OCI_ACCOUNT_CONTEXT_DAILY',
                        'OCI_ACCOUNT_CONTRACT_MONTHLY');
    EXIT WHEN L_FINISHED_JOBS=2;
    DBMS_LOCK.SLEEP(5);
  END LOOP;
  IF L_FINISHED_JOBS<2 THEN
    DBMS_OUTPUT.PUT_LINE('Initial syncs still running after bounded wait');
  END IF;
END;
/

@02_providers/OCI/02_account_contracts/verify/02_check_oci_account_contract_sync.sql

PROMPT OCI ACCOUNT CONTEXT AND CONTRACT INSTALLATION COMPLETE; CHECK BACKGROUND RUNS

-- Report whole-solution completeness without making it an account prerequisite.
-- This read-only diagnostic reports missing baseline parts without raising errors.
@../monitoring/06_module_installation_health.sql
