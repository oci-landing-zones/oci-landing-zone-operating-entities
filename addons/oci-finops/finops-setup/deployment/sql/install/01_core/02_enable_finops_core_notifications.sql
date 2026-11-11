-- Enable the common email report after installation. Run as FOCUSPLATFORM.
SET DEFINE OFF VERIFY OFF SERVEROUTPUT ON
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

DECLARE
  L_TOPIC VARCHAR2(255) := JSON_VALUE(:fp_install_config,'$.notifications_topic_ocid' ERROR ON ERROR);
BEGIN
  IF SYS_CONTEXT('USERENV','SESSION_USER') <> 'FOCUSPLATFORM' OR
     SYS_CONTEXT('USERENV','CURRENT_SCHEMA') <> 'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20920,'Connect as FOCUSPLATFORM');
  END IF;
  IF L_TOPIC IS NULL OR LENGTH(L_TOPIC) > 255 OR
     NOT REGEXP_LIKE(L_TOPIC,'^ocid1\.onstopic\.oc1\.[A-Za-z0-9._-]+$') THEN
    RAISE_APPLICATION_ERROR(-20921,'Enter a valid Notifications topic OCID');
  END IF;
  UPDATE FINOPS_CORE_NOTIFY_CONFIG
     SET TOPIC_OCID=L_TOPIC, ENABLED='Y', UPDATED_AT=SYSTIMESTAMP
   WHERE CONFIG_ID=1;
  IF SQL%ROWCOUNT <> 1 THEN
    RAISE_APPLICATION_ERROR(-20922,'Expected the singleton Notifications configuration row');
  END IF;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Notifications enabled. Confirm OCI publish permission for the ADB resource principal.');
END;
/
UNDEFINE notifications_topic_ocid
@01_core/verify/01_verify_finops_common_core.sql
