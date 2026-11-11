-- Create year pipelines in STOPPED state. The master starts them only after
-- the OAC cost-detail MV has completed its empty initial population.
DECLARE
  L_FIRST_YEAR NUMBER := NVL(JSON_VALUE(:fp_install_config,'$.first_focus_year' RETURNING NUMBER ERROR ON ERROR),:source_first_year);
  L_CURRENT_YEAR PLS_INTEGER;
  L_SOURCE_MODE VARCHAR2(30) := :source_mode;
  L_SOURCE_PREFIX_REGEX VARCHAR2(3000) := :source_prefix_regex;
  L_BASE VARCHAR2(4000);
  L_LOCATION VARCHAR2(8000);
  L_NAME VARCHAR2(128);
  L_FIELD_LIST CLOB;
  L_FORMAT CLOB;
  L_ATTRIBUTES CLOB;
  L_EXISTING NUMBER;
BEGIN
  SELECT EXTRACT(YEAR FROM SYSTIMESTAMP AT TIME ZONE 'UTC')
    INTO L_CURRENT_YEAR FROM DUAL;
  IF L_FIRST_YEAR<>TRUNC(L_FIRST_YEAR) OR L_FIRST_YEAR NOT BETWEEN 1000 AND 9999 OR
     L_FIRST_YEAR < :source_first_year OR
     L_FIRST_YEAR > L_CURRENT_YEAR THEN
    RAISE_APPLICATION_ERROR(-20981,
      'First year must be four digits between the first available source year ' ||
      :source_first_year || ' and the current UTC year ' || L_CURRENT_YEAR);
  END IF;
  SELECT COUNT(*) INTO L_EXISTING FROM USER_CLOUD_PIPELINES
   WHERE REGEXP_LIKE(PIPELINE_NAME, '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$');
  IF L_EXISTING <> 0 THEN
    RAISE_APPLICATION_ERROR(-20982,
      'Year pipelines already exist; inspect them before rerunning this create-only script');
  END IF;
  IF L_SOURCE_MODE = 'ORACLE_MANAGED' THEN
    L_BASE := :source_location_base;
  ELSE
    L_BASE := :source_location_base;
  END IF;
  DBMS_OUTPUT.PUT_LINE('requested_first_year=' || L_FIRST_YEAR ||
    ' earliest_source_year=' || :source_first_year);

  -- The 49 source fields keep the proven OCI FOCUS order and timestamp masks.
  L_FIELD_LIST := q'[
     "AVAILABILITYZONE"            CHAR(4000)
    ,"BILLEDCOST"                  CHAR
    ,"BILLINGACCOUNTID"            CHAR
    ,"BILLINGACCOUNTNAME"          CHAR(32767)
    ,"BILLINGCURRENCY"             CHAR(4000)
    ,"BILLINGPERIODEND"            CHAR date_format TIMESTAMP WITH TIME ZONE MASK "YYYY-MM-DD\"T\"HH24:MI:SS.FF9TZR"
    ,"BILLINGPERIODSTART"          CHAR date_format TIMESTAMP WITH TIME ZONE MASK "YYYY-MM-DD\"T\"HH24:MI:SS.FF9TZR"
    ,"CHARGECATEGORY"              CHAR(4000)
    ,"CHARGEDESCRIPTION"           CHAR(4000)
    ,"CHARGEFREQUENCY"             CHAR(4000)
    ,"CHARGEPERIODEND"             CHAR date_format TIMESTAMP WITH TIME ZONE MASK "YYYY-MM-DD\"T\"HH24:MI$TZR"
    ,"CHARGEPERIODSTART"           CHAR date_format TIMESTAMP WITH TIME ZONE MASK "YYYY-MM-DD\"T\"HH24:MI$TZR"
    ,"CHARGESUBCATEGORY"           CHAR(32767)
    ,"COMMITMENTDISCOUNTCATEGORY"  CHAR(32767)
    ,"COMMITMENTDISCOUNTID"        CHAR(32767)
    ,"COMMITMENTDISCOUNTNAME"      CHAR(32767)
    ,"COMMITMENTDISCOUNTTYPE"      CHAR(32767)
    ,"EFFECTIVECOST"               CHAR
    ,"INVOICEISSUER"               CHAR(4000)
    ,"LISTCOST"                    CHAR
    ,"LISTUNITPRICE"               CHAR
    ,"PRICINGCATEGORY"             CHAR(32767)
    ,"PRICINGQUANTITY"             CHAR
    ,"PRICINGUNIT"                 CHAR(4000)
    ,"PROVIDER"                    CHAR(4000)
    ,"PUBLISHER"                   CHAR(4000)
    ,"REGION"                      CHAR(4000)
    ,"RESOURCEID"                  CHAR(4000)
    ,"RESOURCENAME"                CHAR(32767)
    ,"RESOURCETYPE"                CHAR(4000)
    ,"SERVICECATEGORY"             CHAR(4000)
    ,"SERVICENAME"                 CHAR(4000)
    ,"SKUID"                       CHAR(4000)
    ,"SKUPRICEID"                  CHAR(32767)
    ,"SUBACCOUNTID"               CHAR(4000)
    ,"SUBACCOUNTNAME"             CHAR(4000)
    ,"TAGS"                        CHAR(200000000)
    ,"USAGEQUANTITY"               CHAR
    ,"USAGEUNIT"                   CHAR(4000)
    ,"OCI_REFERENCENUMBER"         CHAR(4000)
    ,"OCI_COMPARTMENTID"           CHAR(4000)
    ,"OCI_COMPARTMENTNAME"         CHAR(4000)
    ,"OCI_OVERAGEFLAG"             CHAR(4000)
    ,"OCI_UNITPRICEOVERAGE"        CHAR
    ,"OCI_BILLEDQUANTITYOVERAGE"   CHAR
    ,"OCI_COSTOVERAGE"             CHAR
    ,"OCI_ATTRIBUTEDUSAGE"         CHAR
    ,"OCI_ATTRIBUTEDCOST"          CHAR
    ,"OCI_BACKREFERENCENUMBER"     CHAR]';

  L_FORMAT := '{
      "type": "csv",
      "delimiter": ",",
      "ignoremissingcolumns": true,
      "ignoreblanklines": true,
      "blankasnull": true,
      "trimspaces": "lrtrim",
      "quote": "\"",
      "characterset": "AL32UTF8",
      "skipheaders": 1,
      "logprefix": "FOCUS",
      "logretention": 7,
      "compression": "gzip",
      "regexuri": false
      }';
  IF L_SOURCE_MODE = 'CUSTOM_BUCKET' THEN
    L_FORMAT := REPLACE(L_FORMAT, '"regexuri": false', '"regexuri": true');
  END IF;

  FOR Y IN L_FIRST_YEAR .. L_CURRENT_YEAR LOOP
    L_NAME := 'OCI_FOCUS_REPORTS_LOAD_' || TO_CHAR(Y, 'FM0000');
    DBMS_CLOUD_PIPELINE.CREATE_PIPELINE(
      PIPELINE_NAME => L_NAME,
      PIPELINE_TYPE => 'LOAD',
      DESCRIPTION => 'OCI FOCUS ' || Y || ' into shared OCI landing');
    SELECT JSON_OBJECT(
      'credential_name' VALUE 'OCI' || CHR(36) || 'RESOURCE_PRINCIPAL',
      'location' VALUE CASE
        WHEN L_SOURCE_MODE = 'ORACLE_MANAGED' THEN
          L_BASE || TO_CHAR(Y, 'FM0000') || '/*/*/*.csv.gz'
        WHEN L_SOURCE_PREFIX_REGEX IS NULL OR L_SOURCE_PREFIX_REGEX = '' THEN
          L_BASE || '/' || TO_CHAR(Y, 'FM0000') || '/.*[.]csv[.]gz'
        ELSE
          L_BASE || '/' || L_SOURCE_PREFIX_REGEX || '/' ||
          TO_CHAR(Y, 'FM0000') || '/.*[.]csv[.]gz'
        END,
      'table_name' VALUE 'OCI_FOCUS_REPORTS',
      'table_owner' VALUE USER,
      'field_list' VALUE L_FIELD_LIST,
      'format' VALUE L_FORMAT,
      'priority' VALUE 'HIGH',
      'interval' VALUE '60'
      RETURNING CLOB) INTO L_ATTRIBUTES FROM DUAL;
    DBMS_CLOUD_PIPELINE.SET_ATTRIBUTE(
      PIPELINE_NAME => L_NAME,
      ATTRIBUTES => L_ATTRIBUTES);
    IF L_SOURCE_MODE = 'ORACLE_MANAGED' THEN
      L_LOCATION := L_BASE || TO_CHAR(Y, 'FM0000') || '/*/*/*.csv.gz';
    ELSIF L_SOURCE_PREFIX_REGEX IS NULL OR L_SOURCE_PREFIX_REGEX = '' THEN
      L_LOCATION := L_BASE || '/' || TO_CHAR(Y, 'FM0000') || '/.*[.]csv[.]gz';
    ELSE
      L_LOCATION := L_BASE || '/' || L_SOURCE_PREFIX_REGEX || '/' ||
        TO_CHAR(Y, 'FM0000') || '/.*[.]csv[.]gz';
    END IF;
    DBMS_OUTPUT.PUT_LINE('created=' || L_NAME ||
      ' source=' || L_LOCATION || ' target=OCI_FOCUS_REPORTS');
  END LOOP;
  DBMS_OUTPUT.PUT_LINE('created_years=' || L_FIRST_YEAR || '-' || L_CURRENT_YEAR ||
    ' pipeline_count=' || (L_CURRENT_YEAR - L_FIRST_YEAR + 1) ||
    ' started=0');
END;
/

UNDEFINE first_year
UNDEFINE suggested_year
SET FEEDBACK ON
-- Register OCI only after provider code and pipeline creation have passed.
SET DEFINE OFF
INSERT INTO FINOPS_CORE_PROVIDER
  (PROVIDER_CODE, LANDING_TABLE, API_PACKAGE, ENABLED,
   MAX_FILES_PER_PIPELINE)
VALUES
  ('OCI', 'OCI_FOCUS_REPORTS', 'OCI_FOCUS_CORE_API', 'N', 2000);
COMMIT;

-- Validate the new pipeline definitions without starting their scheduler jobs.
SET DEFINE OFF SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

DECLARE
  L_COUNT PLS_INTEGER;
  L_FIRST_YEAR PLS_INTEGER;
  L_LAST_YEAR PLS_INTEGER;
  L_WRONG_TYPES PLS_INTEGER;
  L_WRONG_STATUS PLS_INTEGER;
  L_WRONG_TARGETS PLS_INTEGER;
  L_WRONG_SOURCES PLS_INTEGER;
  L_WRONG_INTERVALS PLS_INTEGER;
BEGIN
  SELECT COUNT(*), MIN(TO_NUMBER(SUBSTR(PIPELINE_NAME, -4))),
         MAX(TO_NUMBER(SUBSTR(PIPELINE_NAME, -4))),
         COUNT(CASE WHEN PIPELINE_TYPE <> 'LOAD' THEN 1 END),
         COUNT(CASE WHEN STATUS <> 'STOPPED' THEN 1 END)
    INTO L_COUNT, L_FIRST_YEAR, L_LAST_YEAR,
         L_WRONG_TYPES, L_WRONG_STATUS
    FROM USER_CLOUD_PIPELINES
   WHERE REGEXP_LIKE(PIPELINE_NAME, '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$');
  IF L_COUNT = 0 OR L_COUNT <> L_LAST_YEAR - L_FIRST_YEAR + 1 OR
     L_WRONG_TYPES <> 0 OR L_WRONG_STATUS <> 0 THEN
    RAISE_APPLICATION_ERROR(-20911,
      'OCI year pipelines are missing, noncontiguous or not stopped');
  END IF;

  SELECT COUNT(*) INTO L_WRONG_TARGETS
    FROM USER_CLOUD_PIPELINES P
    LEFT JOIN USER_CLOUD_PIPELINE_ATTRIBUTES A
      ON A.PIPELINE_NAME = P.PIPELINE_NAME
     AND A.ATTRIBUTE_NAME = 'table_name'
   WHERE REGEXP_LIKE(P.PIPELINE_NAME,
                     '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$')
     AND (A.PIPELINE_NAME IS NULL OR
          NVL(UPPER(TRIM(DBMS_LOB.SUBSTR(A.ATTRIBUTE_VALUE,128,1))), '?') <>
          'OCI_FOCUS_REPORTS');
  SELECT COUNT(*) INTO L_WRONG_SOURCES
    FROM USER_CLOUD_PIPELINES P
    LEFT JOIN USER_CLOUD_PIPELINE_ATTRIBUTES A
      ON A.PIPELINE_NAME = P.PIPELINE_NAME
     AND A.ATTRIBUTE_NAME = 'location'
    LEFT JOIN USER_CLOUD_PIPELINE_ATTRIBUTES F
      ON F.PIPELINE_NAME = P.PIPELINE_NAME
     AND F.ATTRIBUTE_NAME = 'format'
   WHERE REGEXP_LIKE(P.PIPELINE_NAME,
                     '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$')
     AND (A.PIPELINE_NAME IS NULL OR F.PIPELINE_NAME IS NULL OR
          INSTR(DBMS_LOB.SUBSTR(A.ATTRIBUTE_VALUE,4000,1), '/b/') = 0 OR
          CASE
            WHEN REGEXP_LIKE(DBMS_LOB.SUBSTR(F.ATTRIBUTE_VALUE,4000,1),
                             '"regexuri"\s*:\s*true', 'i') THEN
              CASE WHEN SUBSTR(DBMS_LOB.SUBSTR(A.ATTRIBUTE_VALUE,4000,1),
                               -LENGTH(SUBSTR(P.PIPELINE_NAME,-4) ||
                                 '/.*[.]csv[.]gz')) <>
                             SUBSTR(P.PIPELINE_NAME,-4) || '/.*[.]csv[.]gz'
                     THEN 1 ELSE 0 END
            ELSE
              CASE WHEN SUBSTR(DBMS_LOB.SUBSTR(A.ATTRIBUTE_VALUE,4000,1),
                               -LENGTH('/0000/*/*/*.csv.gz')) <>
                             '/' || SUBSTR(P.PIPELINE_NAME,-4) || '/*/*/*.csv.gz'
                     THEN 1 ELSE 0 END
          END = 1);
  SELECT COUNT(*) INTO L_WRONG_INTERVALS
    FROM USER_CLOUD_PIPELINES P
    LEFT JOIN USER_CLOUD_PIPELINE_ATTRIBUTES A
      ON A.PIPELINE_NAME = P.PIPELINE_NAME
     AND A.ATTRIBUTE_NAME = 'interval'
   WHERE REGEXP_LIKE(P.PIPELINE_NAME,
                     '^OCI_FOCUS_REPORTS_LOAD_[0-9]{4}$')
     AND (A.PIPELINE_NAME IS NULL OR
          NVL(TRIM(DBMS_LOB.SUBSTR(A.ATTRIBUTE_VALUE,128,1)), '?') <> '60');
  IF L_WRONG_TARGETS <> 0 OR L_WRONG_SOURCES <> 0 OR
     L_WRONG_INTERVALS <> 0 THEN
    RAISE_APPLICATION_ERROR(-20912,
      'OCI year pipeline target, source or 60-minute interval is wrong');
  END IF;

  COMMIT;
  DBMS_OUTPUT.PUT_LINE('OCI pipelines created=' || L_COUNT ||
    ' years=' || L_FIRST_YEAR || '-' || L_LAST_YEAR ||
    ' started=0 provider_enabled=N');
END;
/
