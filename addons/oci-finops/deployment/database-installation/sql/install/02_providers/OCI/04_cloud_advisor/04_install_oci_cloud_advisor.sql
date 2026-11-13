-- Run as FOCUSPLATFORM from deployment/database-installation/sql/install. Does not change OCI recommendations.
SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK ON SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 190 PAGESIZE 100
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
PROMPT OCI CLOUD ADVISOR INSTALLATION

DECLARE N NUMBER; C NUMBER;
BEGIN
  IF SYS_CONTEXT('USERENV','SESSION_USER')<>'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20740,'Connect as FOCUSPLATFORM');
  END IF;
  SELECT COUNT(*) INTO C FROM USER_OBJECTS
   WHERE OBJECT_NAME='FINOPS_CORE_RUN_DAILY' AND STATUS='VALID';
  SELECT COUNT(*) INTO N FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'OCI_ADVISOR_%' OR OBJECT_NAME='OCI_SYNC_ADVISOR';
  IF C<>1 OR N<>0 THEN
    RAISE_APPLICATION_ERROR(-20740,
      'Install common core first; Advisor module must be clean');
  END IF;
  DBMS_OUTPUT.PUT_LINE('Cloud Advisor module preflight passed');
END;
/

@02_providers/OCI/04_cloud_advisor/internal/00_preflight_oci_advisor_source.sql
@02_providers/OCI/04_cloud_advisor/internal/01_create_oci_advisor_model.sql
@02_providers/OCI/04_cloud_advisor/internal/02_create_oci_advisor_views.sql

INSERT INTO OCI_ADVISOR_CONFIG(TENANCY_OCID,ENDPOINT_REGION,IS_SYNC_ENABLED)
VALUES(:source_tenancy_ocid,:source_home_region,'Y');
COMMIT;

@02_providers/OCI/04_cloud_advisor/internal/03_create_oci_advisor_sync.sql

BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    JOB_NAME=>'OCI_ADVISOR_DAILY',JOB_TYPE=>'STORED_PROCEDURE',
    JOB_ACTION=>'OCI_SYNC_ADVISOR',
    START_DATE=>FINOPS_CORE_SCHEDULE_API.LOCAL_START_DATE(),
    REPEAT_INTERVAL=>'FREQ=DAILY;BYHOUR=05;BYMINUTE=15;BYSECOND=00',
    ENABLED=>TRUE,COMMENTS=>'Read-only OCI Cloud Advisor observations');
END;
/

@02_providers/OCI/04_cloud_advisor/verify/04_verify_oci_cloud_advisor.sql

BEGIN
  DBMS_SCHEDULER.RUN_JOB('OCI_ADVISOR_DAILY',USE_CURRENT_SESSION=>FALSE);
  DBMS_OUTPUT.PUT_LINE('Initial Cloud Advisor sync requested in background');
END;
/
DECLARE N NUMBER;
BEGIN
  FOR I IN 1..12 LOOP
    SELECT COUNT(*) INTO N FROM USER_SCHEDULER_JOB_RUN_DETAILS
     WHERE JOB_NAME='OCI_ADVISOR_DAILY';
    EXIT WHEN N>0;
    DBMS_LOCK.SLEEP(5);
  END LOOP;
END;
/
@02_providers/OCI/04_cloud_advisor/verify/04_check_oci_advisor_sync.sql
PROMPT OCI CLOUD ADVISOR INSTALLATION COMPLETE; CHECK BACKGROUND RUN
