-- Install the complete OCI FOCUS ingestion provider as FOCUSPLATFORM.
-- Start SQL*Plus in deployment/sql/install. This is the only operator command for this
-- module. It creates one landing, one shared remediation stage, year pipelines,
-- and the provider adapter for the already-enabled common daily coordinator.
SET ECHO OFF VERIFY OFF DEFINE OFF FEEDBACK ON SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 190 PAGESIZE 100
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
@00_schema/01_validate_install_parameters.sql
DECLARE
  S JSON_OBJECT_T:=JSON_OBJECT_T.PARSE(JSON_QUERY(:fp_install_config,'$.focus_source' RETURNING CLOB ERROR ON ERROR));
  M VARCHAR2(30);
BEGIN
  S.ON_ERROR(1); M:=S.GET_STRING('mode');
  IF M IS NULL OR M NOT IN ('ORACLE_MANAGED','CUSTOM_BUCKET') THEN
    RAISE_APPLICATION_ERROR(-20990,'focus_source.mode must be ORACLE_MANAGED or CUSTOM_BUCKET');
  END IF;
  IF M='CUSTOM_BUCKET' AND (S.GET_STRING('region') IS NULL OR S.GET_STRING('namespace') IS NULL OR S.GET_STRING('bucket') IS NULL) THEN
    RAISE_APPLICATION_ERROR(-20990,'Customer source requires region, namespace and bucket');
  END IF;
END;
/

PROMPT OCI FOCUS INGESTION INSTALLATION

DECLARE
  L_CORE NUMBER;
  L_OCI NUMBER;
  L_PIPELINES NUMBER;
  L_PROVIDERS NUMBER;
  L_RUNNING NUMBER;
  L_LOCK_POLICY NUMBER;
  L_JOB VARCHAR2(5);
  L_NOTIFY CHAR(1);
BEGIN
  IF SYS_CONTEXT('USERENV', 'SESSION_USER') <> 'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20960,
      'Connect as FOCUSPLATFORM before installing OCI ingestion');
  END IF;
  SELECT COUNT(*) INTO L_CORE FROM USER_OBJECTS
   WHERE OBJECT_NAME IN ('FINOPS_CORE_PROVIDER', 'FINOPS_CORE_RUN_DAILY',
                         'FINOPS_CORE_REPORT') AND STATUS = 'VALID';
  SELECT COUNT(*) INTO L_OCI FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'OCI_FOCUS_%';
  SELECT COUNT(*) INTO L_PIPELINES FROM USER_CLOUD_PIPELINES
   WHERE REGEXP_LIKE(PIPELINE_NAME, '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$');
  SELECT COUNT(*) INTO L_PROVIDERS FROM FINOPS_CORE_PROVIDER
   WHERE PROVIDER_CODE = 'OCI';
  SELECT COUNT(*) INTO L_RUNNING FROM USER_SCHEDULER_RUNNING_JOBS
   WHERE JOB_NAME = 'FINOPS_CORE_DAILY';
  SELECT COUNT(*) INTO L_LOCK_POLICY FROM USER_SOURCE
   WHERE NAME = 'FINOPS_CORE_RUN_DAILY' AND TYPE = 'PROCEDURE'
     AND UPPER(TEXT) LIKE '%TIMEOUT => 0%';
  SELECT ENABLED INTO L_JOB FROM USER_SCHEDULER_JOBS
   WHERE JOB_NAME = 'FINOPS_CORE_DAILY';
  SELECT ENABLED INTO L_NOTIFY FROM FINOPS_CORE_NOTIFY_CONFIG
   WHERE CONFIG_ID = 1;
  IF L_CORE <> 3 OR L_OCI <> 0 OR L_PIPELINES <> 0 OR
     L_PROVIDERS <> 0 OR L_RUNNING <> 0 OR L_LOCK_POLICY <> 1 OR
     L_JOB <> 'TRUE' OR L_NOTIFY NOT IN ('Y', 'N') THEN
    RAISE_APPLICATION_ERROR(-20961,
      'OCI ingestion requires a clean provider state and updated, idle common core');
  END IF;
  DBMS_OUTPUT.PUT_LINE('Core and clean OCI provider preflight passed');
END;
/

-- The landing and remediation schema do not depend on the selected source
-- year. P_INIT ends before 2024; monthly partitions begin with 2024 data.
@02_providers/OCI/00_ingestion/internal/01_create_oci_storage.sql
@02_providers/OCI/00_ingestion/internal/02_install_failure_detection.sql
@02_providers/OCI/00_ingestion/internal/03_install_row_remediation.sql
@02_providers/OCI/00_ingestion/internal/04_install_recovery.sql
@02_providers/OCI/00_ingestion/internal/09_install_retention.sql
@02_providers/OCI/00_ingestion/internal/05_install_reporting_adapter.sql

-- Stop before creating live source pipelines if any procedure failed to
-- compile. DDL already committed, so inspect USER_ERRORS rather than rerunning.
DECLARE
  L_VALID_CODE NUMBER;
  L_INVALID NUMBER;
BEGIN
  SELECT COUNT(*) INTO L_VALID_CODE FROM USER_OBJECTS
   WHERE OBJECT_NAME IN ('OCI_FOCUS_SOURCE_PREFIX',
       'OCI_FOCUS_FILL_SOURCE_URIS', 'OCI_FOCUS_DISCOVER_FAILURES',
       'OCI_FOCUS_REMED_MUTEX', 'OCI_FOCUS_REMED_NUMBER',
       'OCI_FOCUS_REMED_TIMESTAMP', 'OCI_FOCUS_REMEDIATE_FILES',
       'OCI_FOCUS_RESOLVE_MANUAL_ROW',
       'OCI_FOCUS_COPY_RECOVERY_DECIDE', 'OCI_FOCUS_RECOVER_COPYING',
       'OCI_FOCUS_RECOVER_ACTIVE_FILE',
       'OCI_FOCUS_GET_INGESTION_REPORT', 'OCI_FOCUS_CORE_API', 'OCI_FOCUS_RETENTION_API')
     AND OBJECT_TYPE IN ('FUNCTION','PROCEDURE','PACKAGE','PACKAGE BODY')
     AND STATUS = 'VALID';
  SELECT COUNT(*) INTO L_INVALID FROM USER_OBJECTS
   WHERE OBJECT_NAME LIKE 'OCI_FOCUS_%' AND STATUS <> 'VALID';
  IF L_VALID_CODE <> 17 OR L_INVALID <> 0 THEN
    RAISE_APPLICATION_ERROR(-20965,
      'OCI provider code is incomplete or invalid; inspect USER_ERRORS');
  END IF;
  DBMS_OUTPUT.PUT_LINE('OCI code compilation gate passed');
END;
/

-- Discover available FOCUS years and choose the first pipeline year only
-- after all provider objects are valid. A valid choice creates and starts
-- the year pipelines. All of them target the same landing table.
SET DEFINE OFF VERIFY OFF
SET ECHO OFF VERIFY OFF DEFINE OFF SERVEROUTPUT ON SIZE UNLIMITED FEEDBACK OFF
SET LINESIZE 180 PAGESIZE 100
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
VARIABLE source_first_year NUMBER
VARIABLE source_home_region VARCHAR2(64)
VARIABLE source_tenancy_ocid VARCHAR2(512)
VARIABLE source_mode VARCHAR2(30)
VARIABLE source_region VARCHAR2(64)
VARIABLE source_namespace VARCHAR2(255)
VARIABLE source_bucket VARCHAR2(256)
VARIABLE source_prefix_raw VARCHAR2(1000)
VARIABLE source_prefix_uri VARCHAR2(3000)
VARIABLE source_prefix_regex VARCHAR2(3000)
VARIABLE source_location_base VARCHAR2(4000)

-- Read-only preflight. Complete it before asking for the requested year.
DECLARE
  L_SOURCE_MODE VARCHAR2(30) := UPPER(JSON_VALUE(:fp_install_config,'$.focus_source.mode' ERROR ON ERROR));
  L_SOURCE_REGION VARCHAR2(64);
  L_REALM_DOMAIN VARCHAR2(255) := JSON_VALUE(:fp_install_config,'$.focus_source.realm_domain' ERROR ON ERROR);
  L_SOURCE_NAMESPACE VARCHAR2(255);
  L_SOURCE_BUCKET VARCHAR2(256);
  L_SOURCE_PREFIX_REGEX VARCHAR2(3000);
  L_SOURCE_PREFIX_URI VARCHAR2(3000) := JSON_VALUE(:fp_install_config,'$.focus_source.prefix' ERROR ON ERROR);
  L_SOURCE_PREFIX_RAW VARCHAR2(1000);
  L_SOURCE_LOCATION_BASE VARCHAR2(4000);
  L_LISTING_BASE_URI VARCHAR2(4000);
  L_LIST_PREFIX VARCHAR2(4000);
  L_ADB_REGION VARCHAR2(64);
  L_TENANCY_OCID VARCHAR2(512);
  L_HOME_REGION VARCHAR2(64);
  L_RESPONSE DBMS_CLOUD_TYPES.RESP;
  L_RESPONSE_BODY CLOB;
  L_HOME_COUNT NUMBER;
  L_OBJECT_URI VARCHAR2(8000);
  L_NEXT_START VARCHAR2(4000);
  L_PAGE_MIN_YEAR NUMBER;
  L_MIN_SOURCE_YEAR NUMBER;
  L_YEAR_PREFIX VARCHAR2(4000);
  L_YEAR_PREFIX_RAW VARCHAR2(4000);
  L_RELATIVE_PREFIX VARCHAR2(2000);
  L_PAGES PLS_INTEGER := 0;
  L_EXISTING NUMBER;
BEGIN
  IF L_SOURCE_MODE NOT IN ('ORACLE_MANAGED', 'CUSTOM_BUCKET') THEN
    RAISE_APPLICATION_ERROR(-20989,
      'FOCUS source must be ORACLE_MANAGED or CUSTOMER_BUCKET');
  END IF;
  SELECT COUNT(*) INTO L_EXISTING FROM USER_CLOUD_PIPELINES
   WHERE REGEXP_LIKE(PIPELINE_NAME, '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$');
  IF L_EXISTING <> 0 THEN
    RAISE_APPLICATION_ERROR(-20982,
      'Year pipelines already exist; inspect them before rerunning this create-only script');
  END IF;
  SELECT JSON_VALUE(CLOUD_IDENTITY, '$.TENANT_OCID'),
         JSON_VALUE(CLOUD_IDENTITY, '$.REGION')
    INTO L_TENANCY_OCID, L_ADB_REGION
    FROM V$PDBS
   WHERE CON_ID = TO_NUMBER(SYS_CONTEXT('USERENV', 'CON_ID'));
  L_TENANCY_OCID := LOWER(L_TENANCY_OCID);
  L_ADB_REGION := LOWER(L_ADB_REGION);
  IF L_ADB_REGION IS NULL OR L_TENANCY_OCID IS NULL OR
     NOT REGEXP_LIKE(L_ADB_REGION, '^[a-z0-9]+(-[a-z0-9]+)+$') OR
     NOT REGEXP_LIKE(L_TENANCY_OCID, '^ocid1\.tenancy\.') THEN
    RAISE_APPLICATION_ERROR(-20983,
      'Invalid REGION or TENANT_OCID in V$PDBS.CLOUD_IDENTITY');
  END IF;
  IF L_REALM_DOMAIN IS NULL THEN
    IF REGEXP_SUBSTR(L_TENANCY_OCID, '[^.]+', 1, 3) <> 'oc1' THEN
      RAISE_APPLICATION_ERROR(-20990,
        'Resolve the source realm domain with the Python installer before ingestion');
    END IF;
    L_REALM_DOMAIN := 'oraclecloud.com';
  END IF;
  IF NOT REGEXP_LIKE(L_REALM_DOMAIN, '^[a-z0-9]+([.-][a-z0-9]+)*$') THEN
    RAISE_APPLICATION_ERROR(-20990, 'Invalid source realm domain');
  END IF;
  IF L_SOURCE_MODE = 'ORACLE_MANAGED' AND
     JSON_VALUE(:fp_install_config,'$.focus_source.region' ERROR ON ERROR) IS NULL THEN
    -- Legacy configuration: discover the original Oracle-managed defaults.
    L_SOURCE_NAMESPACE := 'bling';
    L_SOURCE_BUCKET := L_TENANCY_OCID;
    L_SOURCE_PREFIX_RAW := 'FOCUS Reports';
    L_SOURCE_PREFIX_URI := 'FOCUS%20Reports';
    -- The ADB region can differ from the tenancy home region. Resolve the
    -- Oracle-managed report bucket region through OCI Identity.
    L_RESPONSE := DBMS_CLOUD.SEND_REQUEST(
      CREDENTIAL_NAME => 'OCI' || CHR(36) || 'RESOURCE_PRINCIPAL',
      URI => 'https://identity.' || L_ADB_REGION ||
        '.oci.' || L_REALM_DOMAIN || '/20160918/tenancies/' || L_TENANCY_OCID ||
        '/regionSubscriptions',
      METHOD => DBMS_CLOUD.METHOD_GET,
      TIMEOUT => 120);
    IF DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE) <> 200 THEN
      RAISE_APPLICATION_ERROR(-20984,
        'OCI Identity regionSubscriptions returned HTTP ' ||
        DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE));
    END IF;
    L_RESPONSE_BODY := DBMS_CLOUD.GET_RESPONSE_TEXT(L_RESPONSE);
    SELECT COUNT(*), MAX(REGION_NAME)
      INTO L_HOME_COUNT, L_HOME_REGION
      FROM JSON_TABLE(L_RESPONSE_BODY, '$[*]'
        COLUMNS (IS_HOME VARCHAR2(5) PATH '$.isHomeRegion',
                 REGION_NAME VARCHAR2(64) PATH '$.regionName'))
     WHERE LOWER(IS_HOME) = 'true';
    IF L_HOME_COUNT <> 1 OR L_HOME_REGION IS NULL OR
       NOT REGEXP_LIKE(L_HOME_REGION, '^[a-z0-9]+(-[a-z0-9]+)+$') THEN
      RAISE_APPLICATION_ERROR(-20985,
        'OCI Identity did not return exactly one valid tenancy home region');
    END IF;
    L_SOURCE_REGION := LOWER(L_HOME_REGION);
  ELSE
    L_SOURCE_REGION := LOWER(JSON_VALUE(:fp_install_config,'$.focus_source.region' ERROR ON ERROR));
    L_SOURCE_NAMESPACE := JSON_VALUE(:fp_install_config,'$.focus_source.namespace' ERROR ON ERROR);
    L_SOURCE_BUCKET := JSON_VALUE(:fp_install_config,'$.focus_source.bucket' ERROR ON ERROR);
    L_SOURCE_PREFIX_URI := NVL(JSON_VALUE(:fp_install_config,'$.focus_source.prefix' ERROR ON ERROR),'NONE');
    IF L_SOURCE_REGION IS NULL OR L_SOURCE_NAMESPACE IS NULL OR L_SOURCE_BUCKET IS NULL OR
       UPPER(L_SOURCE_REGION) = 'NONE' OR
       NOT REGEXP_LIKE(L_SOURCE_REGION, '^[a-z0-9]+(-[a-z0-9]+)+$') OR
       UPPER(L_SOURCE_NAMESPACE) = 'NONE' OR
       NOT REGEXP_LIKE(L_SOURCE_NAMESPACE, '^[A-Za-z0-9][A-Za-z0-9.-]{0,254}$') OR
       UPPER(L_SOURCE_BUCKET) = 'NONE' OR
       NOT REGEXP_LIKE(L_SOURCE_BUCKET, '^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$') OR
       (UPPER(L_SOURCE_PREFIX_URI) <> 'NONE' AND
        (LENGTH(L_SOURCE_PREFIX_URI) > 200 OR
         NOT REGEXP_LIKE(L_SOURCE_PREFIX_URI,
           '^([A-Za-z0-9._~/-]|%[0-9A-Fa-f][0-9A-Fa-f])*$'))) THEN
      RAISE_APPLICATION_ERROR(-20990,
        'FOCUS bucket settings are invalid; use a region, namespace, bucket, and URL-encoded prefix');
    END IF;
    IF UPPER(L_SOURCE_PREFIX_URI) = 'NONE' THEN
      L_SOURCE_PREFIX_URI := NULL;
      L_SOURCE_PREFIX_RAW := NULL;
    ELSE
      L_SOURCE_PREFIX_URI := REGEXP_REPLACE(L_SOURCE_PREFIX_URI, '/+$', '');
      L_SOURCE_PREFIX_RAW := UTL_URL.UNESCAPE(L_SOURCE_PREFIX_URI, 'AL32UTF8');
    END IF;
  END IF;

  L_LISTING_BASE_URI := 'https://objectstorage.' || L_SOURCE_REGION ||
    '.' || L_REALM_DOMAIN || '/n/' || L_SOURCE_NAMESPACE || '/b/' || L_SOURCE_BUCKET || '/o';
  IF L_SOURCE_MODE = 'ORACLE_MANAGED' THEN
    L_SOURCE_LOCATION_BASE := L_LISTING_BASE_URI || '/' ||
      CASE WHEN L_SOURCE_PREFIX_URI IS NOT NULL THEN L_SOURCE_PREFIX_URI || '/' END;
    IF L_SOURCE_PREFIX_URI IS NOT NULL THEN
      L_LIST_PREFIX := REPLACE(L_SOURCE_PREFIX_URI, '/', '%2F') || '%2F';
    END IF;
  ELSE
    L_SOURCE_LOCATION_BASE := L_LISTING_BASE_URI;
    IF L_SOURCE_PREFIX_URI IS NOT NULL THEN
      L_LIST_PREFIX := REPLACE(L_SOURCE_PREFIX_URI, '/', '%2F') || '%2F';
    END IF;
  END IF;

  -- List only the immediate year prefixes. Customer pipelines may then
  -- match report objects at any depth below their year folder.
  LOOP
    L_OBJECT_URI := L_LISTING_BASE_URI || '?';
    IF L_LIST_PREFIX IS NOT NULL THEN
      L_OBJECT_URI := L_OBJECT_URI || 'prefix=' || L_LIST_PREFIX || CHR(38);
    END IF;
    L_OBJECT_URI := L_OBJECT_URI || 'delimiter=%2F' || CHR(38) || 'limit=1000';
    IF L_NEXT_START IS NOT NULL THEN
      L_OBJECT_URI := L_OBJECT_URI || CHR(38) || 'start=' ||
        UTL_URL.ESCAPE(L_NEXT_START, TRUE, 'AL32UTF8');
    END IF;
    L_RESPONSE := DBMS_CLOUD.SEND_REQUEST(
      CREDENTIAL_NAME => 'OCI' || CHR(36) || 'RESOURCE_PRINCIPAL',
      URI => L_OBJECT_URI,
      METHOD => DBMS_CLOUD.METHOD_GET,
      TIMEOUT => 120);
    IF DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE) <> 200 THEN
      RAISE_APPLICATION_ERROR(-20986,
        'FOCUS source year listing returned HTTP ' ||
        DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE));
    END IF;
    L_RESPONSE_BODY := DBMS_CLOUD.GET_RESPONSE_TEXT(L_RESPONSE);
    FOR P IN (
      SELECT YEAR_PREFIX FROM JSON_TABLE(L_RESPONSE_BODY, '$.prefixes[*]'
        COLUMNS (YEAR_PREFIX VARCHAR2(4000) PATH '$'))
    ) LOOP
      L_YEAR_PREFIX_RAW := UTL_URL.UNESCAPE(P.YEAR_PREFIX, 'AL32UTF8');
      IF L_SOURCE_PREFIX_RAW IS NULL THEN
        L_RELATIVE_PREFIX := L_YEAR_PREFIX_RAW;
      ELSIF SUBSTR(L_YEAR_PREFIX_RAW, 1, LENGTH(L_SOURCE_PREFIX_RAW) + 1) =
            L_SOURCE_PREFIX_RAW || '/' THEN
        L_RELATIVE_PREFIX := SUBSTR(L_YEAR_PREFIX_RAW, LENGTH(L_SOURCE_PREFIX_RAW) + 2);
      ELSE
        L_RELATIVE_PREFIX := NULL;
      END IF;
      IF REGEXP_LIKE(L_RELATIVE_PREFIX, '^[0-9]{4}/$') THEN
        L_PAGE_MIN_YEAR := LEAST(NVL(L_PAGE_MIN_YEAR,
          TO_NUMBER(SUBSTR(L_RELATIVE_PREFIX, 1, 4))),
          TO_NUMBER(SUBSTR(L_RELATIVE_PREFIX, 1, 4)));
      END IF;
    END LOOP;
    IF L_PAGE_MIN_YEAR IS NOT NULL THEN
      L_MIN_SOURCE_YEAR := LEAST(NVL(L_MIN_SOURCE_YEAR, L_PAGE_MIN_YEAR),
        L_PAGE_MIN_YEAR);
    END IF;
    L_NEXT_START := JSON_VALUE(L_RESPONSE_BODY, '$.nextStartWith');
    L_PAGES := L_PAGES + 1;
    IF L_PAGES > 1000 THEN
      RAISE_APPLICATION_ERROR(-20987,
        'FOCUS source year listing exceeded 1000 pages');
    END IF;
    EXIT WHEN L_NEXT_START IS NULL;
  END LOOP;
  IF L_MIN_SOURCE_YEAR IS NULL THEN
    RAISE_APPLICATION_ERROR(-20988,
      'No four-digit year folders were found under the selected FOCUS source');
  END IF;
  :source_first_year := L_MIN_SOURCE_YEAR;
  :source_home_region := L_HOME_REGION;
  :source_tenancy_ocid := L_TENANCY_OCID;
  :source_mode := L_SOURCE_MODE;
  :source_region := L_SOURCE_REGION;
  :source_namespace := L_SOURCE_NAMESPACE;
  :source_bucket := L_SOURCE_BUCKET;
  :source_prefix_raw := L_SOURCE_PREFIX_RAW;
  :source_prefix_uri := L_SOURCE_PREFIX_URI;
  L_SOURCE_PREFIX_REGEX := REPLACE(NVL(L_SOURCE_PREFIX_URI, ''), '.', '[.]');
  :source_prefix_regex := L_SOURCE_PREFIX_REGEX;
  :source_location_base := L_SOURCE_LOCATION_BASE;
  DBMS_OUTPUT.PUT_LINE('earliest_source_year=' || L_MIN_SOURCE_YEAR ||
    ' source_mode=' || L_SOURCE_MODE ||
    ' source_region=' || L_SOURCE_REGION ||
    ' adb_region=' || L_ADB_REGION);
END;
/

@02_providers/OCI/00_ingestion/internal/06_choose_source_year.sql
SET DEFINE OFF

@02_providers/OCI/00_ingestion/verify/00_verify_oci_ingestion.sql

PROMPT OCI INGESTION STRUCTURE COMPLETE; YEAR PIPELINES REMAIN STOPPED UNTIL OAC MV INITIALIZATION
