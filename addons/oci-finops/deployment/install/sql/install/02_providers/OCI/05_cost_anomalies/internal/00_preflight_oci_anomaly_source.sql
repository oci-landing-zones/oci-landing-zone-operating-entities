-- Read-only OCI source and service access check before creating module objects.
VARIABLE source_tenancy_ocid VARCHAR2(512)
VARIABLE source_home_region VARCHAR2(64)
SET DEFINE OFF SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

DECLARE
  L_TENANCY VARCHAR2(512);
  L_ADB_REGION VARCHAR2(64);
  L_HOME_REGION VARCHAR2(64);
  L_RESPONSE DBMS_CLOUD_TYPES.RESP;
  L_BODY CLOB;
  L_ITEMS JSON_ARRAY_T;
  L_ITEM JSON_OBJECT_T;
  L_DOC JSON_OBJECT_T;
  L_DAY DATE;
  PROCEDURE GET_BODY(P_URI VARCHAR2,P_BODY OUT CLOB) IS
  BEGIN
    L_RESPONSE:=DBMS_CLOUD.SEND_REQUEST(
      CREDENTIAL_NAME=>'OCI$RESOURCE_PRINCIPAL',URI=>P_URI,
      METHOD=>DBMS_CLOUD.METHOD_GET,TIMEOUT=>120);
    IF DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE)<>200 THEN
      RAISE_APPLICATION_ERROR(-20730,'OCI source preflight HTTP '||
        DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE));
    END IF;
    P_BODY:=DBMS_CLOUD.GET_RESPONSE_TEXT(L_RESPONSE);
  END;
BEGIN
  SELECT LOWER(JSON_VALUE(CLOUD_IDENTITY,'$.TENANT_OCID')),
         LOWER(JSON_VALUE(CLOUD_IDENTITY,'$.REGION'))
    INTO L_TENANCY,L_ADB_REGION FROM V$PDBS
   WHERE CON_ID=TO_NUMBER(SYS_CONTEXT('USERENV','CON_ID'));
  IF NOT REGEXP_LIKE(L_TENANCY,'^ocid1\.tenancy\.') OR
     NOT REGEXP_LIKE(L_ADB_REGION,'^[a-z0-9]+(-[a-z0-9]+)+$') THEN
    RAISE_APPLICATION_ERROR(-20731,'ADB source identity is unavailable');
  END IF;
  GET_BODY('https://identity.'||L_ADB_REGION||
    '.oci.oraclecloud.com/20160918/tenancies/'||L_TENANCY||
    '/regionSubscriptions',L_BODY);
  L_ITEMS:=JSON_ARRAY_T.PARSE(L_BODY);
  FOR I IN 0..L_ITEMS.GET_SIZE-1 LOOP
    L_ITEM:=TREAT(L_ITEMS.GET(I) AS JSON_OBJECT_T);
    IF L_ITEM.HAS('isHomeRegion') AND L_ITEM.GET_BOOLEAN('isHomeRegion') THEN
      IF L_HOME_REGION IS NOT NULL THEN
        RAISE_APPLICATION_ERROR(-20731,'Multiple home regions returned');
      END IF;
      L_HOME_REGION:=LOWER(L_ITEM.GET_STRING('regionName'));
    END IF;
  END LOOP;
  IF NOT REGEXP_LIKE(L_HOME_REGION,'^[a-z0-9]+(-[a-z0-9]+)+$') THEN
    RAISE_APPLICATION_ERROR(-20731,'Home region is unavailable');
  END IF;
  GET_BODY('https://costad.'||L_HOME_REGION||
    '.oci.oraclecloud.com/20190111/costAnomalyMonitors?compartmentId='||
    L_TENANCY||'&limit=1',L_BODY);
  L_DOC:=JSON_OBJECT_T.PARSE(L_BODY);
  IF NOT L_DOC.HAS('items') OR NOT L_DOC.GET('items').IS_ARRAY THEN
    RAISE_APPLICATION_ERROR(-20732,'Cost Anomaly response has no items array');
  END IF;
  L_DAY:=TRUNC(SYS_EXTRACT_UTC(SYSTIMESTAMP));
  GET_BODY('https://costad.'||L_HOME_REGION||
    '.oci.oraclecloud.com/20190111/costAnomalyEvents?compartmentId='||
    L_TENANCY||'&limit=1&timeAnomalyEventStartDate='||
    UTL_URL.ESCAPE(TO_CHAR(L_DAY-1,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      TRUE,'AL32UTF8')||'&timeAnomalyEventEndDate='||
    UTL_URL.ESCAPE(TO_CHAR(L_DAY,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      TRUE,'AL32UTF8'),L_BODY);
  L_DOC:=JSON_OBJECT_T.PARSE(L_BODY);
  IF NOT L_DOC.HAS('items') OR NOT L_DOC.GET('items').IS_ARRAY THEN
    RAISE_APPLICATION_ERROR(-20732,'Cost Anomaly events response has no items array');
  END IF;
  :source_tenancy_ocid:=L_TENANCY;
  :source_home_region:=L_HOME_REGION;
  DBMS_OUTPUT.PUT_LINE('Cost Anomaly source preflight passed: home_region='||
    L_HOME_REGION);
END;
/
