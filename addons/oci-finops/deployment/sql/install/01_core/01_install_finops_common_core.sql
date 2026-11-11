-- Install the provider-neutral coordinator as FOCUSPLATFORM.
-- A Notifications topic is optional. The one common job is enabled;
-- providers remain absent until their independently verified installation.
SET DEFINE OFF VERIFY OFF SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
@00_schema/01_validate_install_parameters.sql

DECLARE
  L_EXISTING NUMBER;
BEGIN
  IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20900,
      'Connect as FOCUSPLATFORM before installing the common core');
  END IF;
  SELECT COUNT(*) INTO L_EXISTING FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'FINOPS_CORE_%';
  IF L_EXISTING <> 0 THEN
    RAISE_APPLICATION_ERROR(-20900,
      'FINOPS_CORE objects already exist; inspect before rerunning installation');
  END IF;
END;
/

DECLARE
  L_TOPIC VARCHAR2(255) := JSON_VALUE(:fp_install_config,'$.notifications_topic_ocid' ERROR ON ERROR);
BEGIN
  IF L_TOPIC IS NOT NULL AND UPPER(L_TOPIC) <> 'NONE' AND
     (LENGTH(L_TOPIC) > 255 OR
      NOT REGEXP_LIKE(L_TOPIC, '^ocid1\.onstopic\.oc1\.[A-Za-z0-9._-]+$')) THEN
    RAISE_APPLICATION_ERROR(-20900,
      'Enter a valid OCI Notifications topic OCID or NONE');
  END IF;
END;
/

DECLARE
  L_TIME_ZONE VARCHAR2(64) := JSON_VALUE(:fp_install_config,'$.scheduler_time_zone' ERROR ON ERROR);
  L_OFFSET VARCHAR2(16);
BEGIN
  IF L_TIME_ZONE IS NULL OR LENGTH(L_TIME_ZONE) > 64 OR
     NOT REGEXP_LIKE(L_TIME_ZONE, '^(UTC|[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)+)$') THEN
    RAISE_APPLICATION_ERROR(-20900,
      'Enter UTC or a valid regional time zone such as Europe/Amsterdam');
  END IF;
  SELECT TZ_OFFSET(L_TIME_ZONE) INTO L_OFFSET FROM DUAL;
  DBMS_OUTPUT.PUT_LINE('Scheduler time zone accepted: ' || L_TIME_ZONE);
END;
/

@01_core/01a_create_finops_core_tables.sql
@01_core/01b_create_finops_core_routines.sql

-- Exercise the coordinator without sending an email before enabling its job.
BEGIN
  FINOPS_CORE_RUN_DAILY('N');
END;
/

BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    JOB_NAME => 'FINOPS_CORE_DAILY',
    JOB_TYPE => 'STORED_PROCEDURE',
    JOB_ACTION => 'FINOPS_CORE_RUN_DAILY',
    START_DATE => FINOPS_CORE_SCHEDULE_API.LOCAL_START_DATE(),
    REPEAT_INTERVAL => 'FREQ=DAILY;BYHOUR=04;BYMINUTE=00;BYSECOND=00',
    ENABLED => TRUE,
    COMMENTS => 'Run installed provider modules and send one combined report');
END;
/

@01_core/verify/01_verify_finops_common_core.sql
