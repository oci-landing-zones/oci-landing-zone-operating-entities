-- Run once as FOCUSPLATFORM from deployment/database-installation/sql/install. Does not process FOCUS rows.
SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK ON SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 190 PAGESIZE 100
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
@00_schema/01_validate_install_parameters.sql

PROMPT OCI DEFINED-TAG CATALOG AND PROFILE INSTALLATION

DECLARE
  L_CORE NUMBER;
  L_TAG_OBJECTS NUMBER;
BEGIN
  IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20930, 'Connect as FOCUSPLATFORM');
  END IF;
  SELECT COUNT(*) INTO L_CORE FROM USER_OBJECTS
   WHERE OBJECT_NAME = 'FINOPS_CORE_RUN_DAILY' AND STATUS = 'VALID';
  SELECT COUNT(*) INTO L_TAG_OBJECTS FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'OCI_TAG_%';
  IF L_CORE <> 1 OR L_TAG_OBJECTS <> 0 THEN
    RAISE_APPLICATION_ERROR(-20931,
      'Common core must be installed; tag catalog must be clean');
  END IF;
  DBMS_OUTPUT.PUT_LINE('Core and clean tag catalog preflight passed');
END;
/

-- Check OCI permissions and the caller-selected tag specification before
-- the first DDL, so a missing prerequisite leaves the schema unchanged.
@02_providers/OCI/01_tags/00_catalog_profile/internal/00_preflight_tag_source.sql

@02_providers/OCI/01_tags/00_catalog_profile/internal/01_create_catalog_storage.sql
@02_providers/OCI/01_tags/00_catalog_profile/internal/02_create_catalog_sync.sql

DECLARE
  L_INVALID NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_INVALID FROM USER_OBJECTS
   WHERE OBJECT_NAME IN ('OCI_TAG_NAMESPACE','OCI_TAG_DEFINITION',
     'OCI_TAG_SYNC_CATALOG') AND STATUS <> 'VALID';
  IF L_INVALID <> 0 THEN
    RAISE_APPLICATION_ERROR(-20932,
      'Invalid OCI catalog objects; inspect USER_ERRORS before continuing');
  END IF;
  DBMS_OUTPUT.PUT_LINE('OCI catalog compilation gate passed');
END;
/

BEGIN
  OCI_TAG_SYNC_CATALOG;
  DBMS_OUTPUT.PUT_LINE('Initial defined-tag catalog loaded');
END;
/

@02_providers/OCI/01_tags/00_catalog_profile/internal/03_create_profiles.sql

DECLARE
  L_INVALID NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_INVALID FROM USER_OBJECTS
   WHERE OBJECT_NAME IN ('OCI_TAG_PROFILE','OCI_TAG_PROFILE_ITEM',
     'OCI_TAG_PROFILE_SELECTION','OCI_TAG_PROFILE_API')
     AND STATUS <> 'VALID';
  IF L_INVALID <> 0 THEN
    RAISE_APPLICATION_ERROR(-20937,
      'Invalid OCI profile objects; inspect USER_ERRORS before continuing');
  END IF;
  OCI_TAG_PROFILE_API.APPLY_SPEC(JSON_QUERY(:fp_install_config,'$.tag_profile' RETURNING CLOB ERROR ON ERROR));
END;
/

BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    JOB_NAME        => 'OCI_TAG_CATALOG_DAILY',
    JOB_TYPE        => 'STORED_PROCEDURE',
    JOB_ACTION      => 'OCI_TAG_SYNC_CATALOG',
    START_DATE      => FINOPS_CORE_SCHEDULE_API.LOCAL_START_DATE(),
    REPEAT_INTERVAL => 'FREQ=DAILY;BYHOUR=00;BYMINUTE=00;BYSECOND=00',
    ENABLED         => TRUE,
    COMMENTS        => 'Refresh OCI defined-tag metadata; no FOCUS row extraction');
  DBMS_OUTPUT.PUT_LINE('Daily catalog sync enabled for 00:00 Scheduler time');
END;
/

@02_providers/OCI/01_tags/00_catalog_profile/verify/00_verify_oci_tag_catalog_profile.sql

PROMPT OCI TAG CATALOG AND PROFILE INSTALLATION COMPLETE
