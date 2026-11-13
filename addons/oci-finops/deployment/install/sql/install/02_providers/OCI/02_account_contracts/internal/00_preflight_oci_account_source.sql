-- Read-only source and permission gate. Sets two SQL*Plus binds for the installer.
VARIABLE source_tenancy_ocid VARCHAR2(512)
VARIABLE source_home_region VARCHAR2(64)
SET DEFINE OFF SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

DECLARE
  L_TENANCY VARCHAR2(512);
  L_ADB_REGION VARCHAR2(64);
  L_HOME_REGION VARCHAR2(64);
  L_BASE VARCHAR2(600);
  L_RESPONSE DBMS_CLOUD_TYPES.RESP;
  L_ITEMS JSON_ARRAY_T;
  L_ITEM JSON_OBJECT_T;
  L_BODY CLOB;
  L_ORG_BASE VARCHAR2(600);
  L_ROLE VARCHAR2(32) := 'UNKNOWN';
  L_ORG_ID VARCHAR2(512);
  L_ORG_PAGE VARCHAR2(4000);
  L_ORG_COUNT NUMBER := 0;
  L_HEADERS JSON_OBJECT_T;
  L_ORG_DOC JSON_OBJECT_T;
  L_ROLE_ERROR VARCHAR2(1000);
  L_SUBS DBMS_CLOUD_OCI_OS_ORGANIZATION_SUBSCRIPTION_LIST_ORGANIZATION_SUBSCRIPTIONS_RESPONSE_T;

  PROCEDURE GET_BODY(P_URI VARCHAR2, P_BODY OUT CLOB) IS
  BEGIN
    L_RESPONSE:=DBMS_CLOUD.SEND_REQUEST(
      CREDENTIAL_NAME=>'OCI$RESOURCE_PRINCIPAL',URI=>P_URI,
      METHOD=>DBMS_CLOUD.METHOD_GET,TIMEOUT=>120);
    IF DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE)<>200 THEN
      RAISE_APPLICATION_ERROR(-20710,'OCI account preflight HTTP '||
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
    RAISE_APPLICATION_ERROR(-20711,'ADB did not expose a valid tenancy and region');
  END IF;
  GET_BODY('https://identity.'||L_ADB_REGION||
    '.oci.oraclecloud.com/20160918/tenancies/'||L_TENANCY||
    '/regionSubscriptions',L_BODY);
  L_ITEMS:=JSON_ARRAY_T.PARSE(L_BODY);
  IF L_ITEMS.GET_SIZE=0 THEN
    RAISE_APPLICATION_ERROR(-20711,'No subscribed regions returned');
  END IF;
  FOR I IN 0..L_ITEMS.GET_SIZE-1 LOOP
    L_ITEM:=TREAT(L_ITEMS.GET(I) AS JSON_OBJECT_T);
    IF L_ITEM.HAS('isHomeRegion') AND L_ITEM.GET_BOOLEAN('isHomeRegion') THEN
      IF L_HOME_REGION IS NOT NULL THEN
        RAISE_APPLICATION_ERROR(-20711,'More than one home region returned');
      END IF;
      L_HOME_REGION:=LOWER(L_ITEM.GET_STRING('regionName'));
    END IF;
  END LOOP;
  IF NOT REGEXP_LIKE(L_HOME_REGION,'^[a-z0-9]+(-[a-z0-9-]+)+$') THEN
    RAISE_APPLICATION_ERROR(-20711,'Home region not found');
  END IF;
  L_BASE:='https://identity.'||L_HOME_REGION||
    '.oci.oraclecloud.com/20160918';
  GET_BODY(L_BASE||'/tenancies/'||L_TENANCY,L_BODY);
  IF JSON_VALUE(L_BODY,'$.id')<>L_TENANCY THEN
    RAISE_APPLICATION_ERROR(-20711,'Tenancy detail identity mismatch');
  END IF;
  GET_BODY(L_BASE||'/compartments?compartmentId='||L_TENANCY||
    '&compartmentIdInSubtree=true&accessLevel=ANY&limit=1',L_BODY);
  L_ITEMS:=JSON_ARRAY_T.PARSE(L_BODY);
  -- Role discovery is diagnostic. Its failure must never turn an API error
  -- into a child-tenancy limitation or imply that a tenancy is standalone.
  L_ORG_BASE:='https://organizations.'||L_HOME_REGION||
    '.oci.oraclecloud.com/20230401';
  BEGIN
    LOOP
      GET_BODY(L_ORG_BASE||'/organizations?compartmentId='||L_TENANCY||
        '&limit=1000'||CASE WHEN L_ORG_PAGE IS NOT NULL THEN
        '&page='||UTL_URL.ESCAPE(L_ORG_PAGE,TRUE,'AL32UTF8') END,L_BODY);
      L_ORG_DOC:=JSON_OBJECT_T.PARSE(L_BODY);
      L_ITEMS:=L_ORG_DOC.GET_ARRAY('items');
      FOR I IN 0..L_ITEMS.GET_SIZE-1 LOOP
        L_ITEM:=TREAT(L_ITEMS.GET(I) AS JSON_OBJECT_T);
        L_ORG_COUNT:=L_ORG_COUNT+1;
        L_ORG_ID:=L_ITEM.GET_STRING('id');
      END LOOP;
      L_HEADERS:=DBMS_CLOUD.GET_RESPONSE_HEADERS(L_RESPONSE);
      EXIT WHEN NOT L_HEADERS.HAS('opc-next-page');
      IF L_ORG_PAGE=L_HEADERS.GET_STRING('opc-next-page') THEN
        RAISE_APPLICATION_ERROR(-20714,'Repeated organization page');
      END IF;
      L_ORG_PAGE:=L_HEADERS.GET_STRING('opc-next-page');
      EXIT WHEN L_ORG_PAGE IS NULL;
    END LOOP;
    IF L_ORG_COUNT=1 AND L_ORG_ID IS NOT NULL THEN
      GET_BODY(L_ORG_BASE||'/organizations/'||L_ORG_ID||
        '/tenancies/'||L_TENANCY,L_BODY);
      L_ROLE:=UPPER(JSON_VALUE(L_BODY,'$.role'));
      IF L_ROLE IS NULL OR L_ROLE NOT IN ('PARENT','CHILD') THEN
        L_ROLE:='UNKNOWN';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    L_ROLE:='UNKNOWN';
    L_ROLE_ERROR:=SUBSTR(SQLERRM,1,1000);
  END;
  DBMS_OUTPUT.PUT_LINE('Account Identity checks passed; organization role='||L_ROLE);
  IF L_ROLE_ERROR IS NOT NULL THEN
    DBMS_OUTPUT.PUT_LINE('Organization role lookup not verified: '||L_ROLE_ERROR);
  END IF;
  BEGIN
  L_SUBS:=DBMS_CLOUD_OCI_OS_ORGANIZATION_SUBSCRIPTION.
    LIST_ORGANIZATION_SUBSCRIPTIONS(
      COMPARTMENT_ID=>L_TENANCY,LIMIT=>1,REGION=>L_HOME_REGION,
      CREDENTIAL_NAME=>'OCI$RESOURCE_PRINCIPAL');
  IF L_SUBS.STATUS_CODE<>200 OR L_SUBS.RESPONSE_BODY IS NULL OR
     L_SUBS.RESPONSE_BODY.COUNT=0 THEN
    RAISE_APPLICATION_ERROR(-20712,
      'Commercial subscription discovery failed or returned no subscriptions');
  END IF;
  EXCEPTION WHEN OTHERS THEN
    IF L_ROLE='CHILD' AND SQLCODE IN (-20401,-20404,-20712) THEN
      RAISE_APPLICATION_ERROR(-20713,
        'CHILD_COMMERCIAL_UNVERIFIED: role=CHILD; Identity passed; commercial '||
        'access pending parent validation. Original error: '||SUBSTR(SQLERRM,1,1000));
    END IF;
    RAISE;
  END;
  :source_tenancy_ocid:=L_TENANCY;
  :source_home_region:=L_HOME_REGION;
  DBMS_OUTPUT.PUT_LINE('OCI account source preflight passed:'||
    ' home_region='||L_HOME_REGION||
    ' organization_role='||L_ROLE||
    ' commercial_subscriptions_visible='||L_SUBS.RESPONSE_BODY.COUNT);
END;
/
