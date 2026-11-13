-- Read-only OCI Budgets collector. Successful snapshots publish atomically per run.
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
SET DEFINE OFF

CREATE OR REPLACE PROCEDURE oci_sync_budgets(p_force_run IN NUMBER DEFAULT 0,p_page_size IN NUMBER DEFAULT 100)
AUTHID DEFINER AS
  L_CONFIG OCI_BUDGET_CONFIG%ROWTYPE;
  L_RUN NUMBER;
  L_BUDGETS NUMBER:=0;
  L_RULES NUMBER:=0;
  L_ENDPOINT VARCHAR2(1000);
  L_RESPONSE DBMS_CLOUD_TYPES.RESP;
  L_HEADERS JSON_OBJECT_T;
  L_CODE NUMBER;
  L_ERROR VARCHAR2(4000);
  L_LOCKED BOOLEAN:=FALSE;
  L_SAVED BOOLEAN:=FALSE;
  L_LOCK_RESULT PLS_INTEGER;
  C_LOCK_ID CONSTANT PLS_INTEGER:=768090433;
  TYPE TOKEN_SET IS TABLE OF BOOLEAN INDEX BY VARCHAR2(4000);
  L_TOKENS TOKEN_SET;

  PROCEDURE REQUEST_JSON(P_PATH VARCHAR2,P_BODY OUT CLOB,P_HEADERS OUT JSON_OBJECT_T) IS
  BEGIN
    L_RESPONSE:=DBMS_CLOUD.SEND_REQUEST(CREDENTIAL_NAME=>L_CONFIG.CREDENTIAL_NAME,
      URI=>L_ENDPOINT||P_PATH,METHOD=>DBMS_CLOUD.METHOD_GET,TIMEOUT=>120);
    IF DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE)<>200 THEN
      RAISE_APPLICATION_ERROR(-20764,'OCI Budgets API returned HTTP '||
        DBMS_CLOUD.GET_RESPONSE_STATUS_CODE(L_RESPONSE));
    END IF;
    P_BODY:=DBMS_CLOUD.GET_RESPONSE_TEXT(L_RESPONSE);
    P_HEADERS:=DBMS_CLOUD.GET_RESPONSE_HEADERS(L_RESPONSE);
  END;

  FUNCTION RESPONSE_ITEMS(P_BODY CLOB) RETURN JSON_ARRAY_T IS
    L_ROOT JSON_ELEMENT_T;
    L_OBJECT JSON_OBJECT_T;
  BEGIN
    L_ROOT:=JSON_ELEMENT_T.PARSE(P_BODY);
    IF L_ROOT.IS_ARRAY THEN
      RETURN TREAT(L_ROOT AS JSON_ARRAY_T);
    ELSIF L_ROOT.IS_OBJECT THEN
      L_OBJECT:=TREAT(L_ROOT AS JSON_OBJECT_T);
      IF L_OBJECT.HAS('items') AND L_OBJECT.GET('items').IS_ARRAY THEN
        RETURN L_OBJECT.GET_ARRAY('items');
      END IF;
    END IF;
    RAISE_APPLICATION_ERROR(-20765,'OCI list response is not an array or an object with items');
  END;

  FUNCTION PAGE_TOKEN(P_HEADERS JSON_OBJECT_T) RETURN VARCHAR2 IS
    K JSON_KEY_LIST;
  BEGIN
    K:=P_HEADERS.GET_KEYS;
    FOR I IN 1..K.COUNT LOOP
      IF LOWER(K(I))='opc-next-page' THEN RETURN P_HEADERS.GET_STRING(K(I)); END IF;
    END LOOP;
    RETURN NULL;
  END;

  PROCEDURE COLLECT_ALERTS(P_BUDGET_ID VARCHAR2) IS
    BASE_PATH VARCHAR2(32767):='/budgets/'||UTL_URL.ESCAPE(P_BUDGET_ID,TRUE,'AL32UTF8')||'/alertRules?limit='||
      TO_CHAR(P_PAGE_SIZE,'FM990');
    PATH VARCHAR2(32767); PAGE VARCHAR2(4000); PAGES NUMBER:=0;
    PAYLOAD CLOB; DETAIL CLOB; H JSON_OBJECT_T; DH JSON_OBJECT_T; D JSON_OBJECT_T; ITEM JSON_OBJECT_T;
    ARR JSON_ARRAY_T; TOKENS TOKEN_SET; RULE_ID VARCHAR2(512);
  BEGIN
    LOOP
      PATH:=BASE_PATH;
      IF PAGE IS NOT NULL THEN PATH:=PATH||'&page='||UTL_URL.ESCAPE(PAGE,TRUE,'AL32UTF8'); END IF;
      REQUEST_JSON(PATH,PAYLOAD,H); ARR:=RESPONSE_ITEMS(PAYLOAD);
      IF ARR.GET_SIZE>0 THEN
        FOR I IN 0..ARR.GET_SIZE-1 LOOP
          ITEM:=TREAT(ARR.GET(I) AS JSON_OBJECT_T); ITEM.ON_ERROR(1);
          RULE_ID:=ITEM.GET_STRING('id');
          IF RULE_ID IS NULL THEN RAISE_APPLICATION_ERROR(-20765,'Alert rule has no id'); END IF;
          REQUEST_JSON('/budgets/'||UTL_URL.ESCAPE(P_BUDGET_ID,TRUE,'AL32UTF8')||'/alertRules/'||
            UTL_URL.ESCAPE(RULE_ID,TRUE,'AL32UTF8'),DETAIL,DH);
          D:=JSON_OBJECT_T.PARSE(DETAIL); D.ON_ERROR(1);
          IF D.GET_STRING('id')<>RULE_ID OR D.GET_STRING('budgetId')<>P_BUDGET_ID THEN
            RAISE_APPLICATION_ERROR(-20765,'Alert-rule detail identity mismatch');
          END IF;
          INSERT INTO OCI_BUDGET_ALERT_RULE_SNAP
            (sync_run_id,budget_id,alert_rule_id,display_name,lifecycle_state,rule_type,
             threshold_type,threshold,recipients_json,message,source_created_at,source_updated_at,source_payload)
          SELECT L_RUN,budget_id,id,display_name,lifecycle_state,rule_type,threshold_type,threshold,
                 recipients_json,message,created_at,updated_at,DETAIL
            FROM JSON_TABLE(DETAIL,'$' ERROR ON ERROR COLUMNS(
              id VARCHAR2(512) PATH '$.id',budget_id VARCHAR2(512) PATH '$.budgetId',
              display_name VARCHAR2(1000) PATH '$.displayName' NULL ON EMPTY,
              lifecycle_state VARCHAR2(64) PATH '$.lifecycleState' NULL ON EMPTY,
              rule_type VARCHAR2(64) PATH '$.type' NULL ON EMPTY,
              threshold_type VARCHAR2(64) PATH '$.thresholdType' NULL ON EMPTY,
              threshold NUMBER PATH '$.threshold' NULL ON EMPTY,
              recipients_json CLOB FORMAT JSON PATH '$.recipients' NULL ON EMPTY,
              message VARCHAR2(4000) PATH '$.message' NULL ON EMPTY,
              created_at TIMESTAMP WITH TIME ZONE PATH '$.timeCreated' NULL ON EMPTY,
              updated_at TIMESTAMP WITH TIME ZONE PATH '$.timeUpdated' NULL ON EMPTY));
          L_RULES:=L_RULES+1;
        END LOOP;
      END IF;
      PAGE:=PAGE_TOKEN(H); PAGES:=PAGES+1;
      IF PAGES>10000 THEN RAISE_APPLICATION_ERROR(-20766,'Alert-rule page limit exceeded'); END IF;
      IF PAGE IS NOT NULL THEN
        IF TOKENS.EXISTS(PAGE) THEN RAISE_APPLICATION_ERROR(-20766,'Repeated alert-rule page token'); END IF;
        TOKENS(PAGE):=TRUE;
      END IF;
      EXIT WHEN PAGE IS NULL;
    END LOOP;
  END;

  PROCEDURE COLLECT_BUDGETS IS
    BASE_PATH VARCHAR2(32767):='/budgets?compartmentId='||UTL_URL.ESCAPE(L_CONFIG.TENANCY_OCID,TRUE,'AL32UTF8')||
      '&targetType=ALL&limit='||TO_CHAR(P_PAGE_SIZE,'FM990');
    PATH VARCHAR2(32767); PAGE VARCHAR2(4000); PAGES NUMBER:=0;
    PAYLOAD CLOB; DETAIL CLOB; H JSON_OBJECT_T; DH JSON_OBJECT_T; D JSON_OBJECT_T; ARR JSON_ARRAY_T;
    TOKENS TOKEN_SET; BUDGET_ID VARCHAR2(512); COMPARTMENT_ID VARCHAR2(512);
  BEGIN
    LOOP
      PATH:=BASE_PATH;
      IF PAGE IS NOT NULL THEN PATH:=PATH||'&page='||UTL_URL.ESCAPE(PAGE,TRUE,'AL32UTF8'); END IF;
      REQUEST_JSON(PATH,PAYLOAD,H); ARR:=RESPONSE_ITEMS(PAYLOAD);
      IF ARR.GET_SIZE>0 THEN
        FOR I IN 0..ARR.GET_SIZE-1 LOOP
          D:=TREAT(ARR.GET(I) AS JSON_OBJECT_T); D.ON_ERROR(1);
          BUDGET_ID:=D.GET_STRING('id'); COMPARTMENT_ID:=D.GET_STRING('compartmentId');
          IF BUDGET_ID IS NULL OR COMPARTMENT_ID IS NULL THEN
            RAISE_APPLICATION_ERROR(-20767,'Budget summary is missing identity');
          END IF;
          REQUEST_JSON('/budgets/'||UTL_URL.ESCAPE(BUDGET_ID,TRUE,'AL32UTF8'),DETAIL,DH);
          D:=JSON_OBJECT_T.PARSE(DETAIL); D.ON_ERROR(1);
          IF D.GET_STRING('id')<>BUDGET_ID OR D.GET_STRING('compartmentId')<>COMPARTMENT_ID THEN
            RAISE_APPLICATION_ERROR(-20767,'Budget detail identity mismatch');
          END IF;
          INSERT INTO OCI_BUDGET_SNAP
            (sync_run_id,budget_id,compartment_id,target_compartment_id,display_name,description,lifecycle_state,
             amount,actual_spend,forecasted_spend,alert_rule_count,reset_period,processing_period_type,
             processing_period_start_offset,target_type,targets_json,start_date,end_date,time_spend_computed,
             source_created_at,source_updated_at,source_payload)
          SELECT L_RUN,id,compartment_id,target_compartment_id,display_name,description,lifecycle_state,
                 amount,actual_spend,forecasted_spend,alert_rule_count,reset_period,processing_period_type,
                 processing_period_start_offset,target_type,targets_json,start_date,end_date,time_spend_computed,
                 created_at,updated_at,DETAIL
            FROM JSON_TABLE(DETAIL,'$' ERROR ON ERROR COLUMNS(
              id VARCHAR2(512) PATH '$.id',compartment_id VARCHAR2(512) PATH '$.compartmentId',
              target_compartment_id VARCHAR2(512) PATH '$.targetCompartmentId' NULL ON EMPTY,
              display_name VARCHAR2(1000) PATH '$.displayName' NULL ON EMPTY,
              description VARCHAR2(4000) PATH '$.description' NULL ON EMPTY,
              lifecycle_state VARCHAR2(64) PATH '$.lifecycleState' NULL ON EMPTY,
              amount NUMBER PATH '$.amount' NULL ON EMPTY,actual_spend NUMBER PATH '$.actualSpend' NULL ON EMPTY,
              forecasted_spend NUMBER PATH '$.forecastedSpend' NULL ON EMPTY,
              alert_rule_count NUMBER PATH '$.alertRuleCount' NULL ON EMPTY,
              reset_period VARCHAR2(64) PATH '$.resetPeriod' NULL ON EMPTY,
              processing_period_type VARCHAR2(64) PATH '$.processingPeriodType' NULL ON EMPTY,
              processing_period_start_offset NUMBER PATH '$.budgetProcessingPeriodStartOffset' NULL ON EMPTY,
              target_type VARCHAR2(64) PATH '$.targetType' NULL ON EMPTY,
              targets_json CLOB FORMAT JSON PATH '$.targets' NULL ON EMPTY,
              start_date TIMESTAMP WITH TIME ZONE PATH '$.startDate' NULL ON EMPTY,
              end_date TIMESTAMP WITH TIME ZONE PATH '$.endDate' NULL ON EMPTY,
              time_spend_computed TIMESTAMP WITH TIME ZONE PATH '$.timeSpendComputed' NULL ON EMPTY,
              created_at TIMESTAMP WITH TIME ZONE PATH '$.timeCreated' NULL ON EMPTY,
              updated_at TIMESTAMP WITH TIME ZONE PATH '$.timeUpdated' NULL ON EMPTY));
          L_BUDGETS:=L_BUDGETS+1;
          COLLECT_ALERTS(BUDGET_ID);
        END LOOP;
      END IF;
      PAGE:=PAGE_TOKEN(H); PAGES:=PAGES+1;
      IF PAGES>10000 THEN RAISE_APPLICATION_ERROR(-20768,'Budget page limit exceeded'); END IF;
      IF PAGE IS NOT NULL THEN
        IF TOKENS.EXISTS(PAGE) THEN RAISE_APPLICATION_ERROR(-20768,'Repeated budget page token'); END IF;
        TOKENS(PAGE):=TRUE;
      END IF;
      EXIT WHEN PAGE IS NULL;
    END LOOP;
  END;
BEGIN
  IF P_FORCE_RUN IS NULL OR P_FORCE_RUN NOT IN (0,1) OR P_PAGE_SIZE IS NULL OR
     P_PAGE_SIZE NOT BETWEEN 1 AND 100 OR P_PAGE_SIZE<>TRUNC(P_PAGE_SIZE) THEN
    RAISE_APPLICATION_ERROR(-20769,'force must be 0/1; page size must be an integer from 1 to 100');
  END IF;
  DECLARE N NUMBER;
  BEGIN
    SELECT COUNT(*) INTO N FROM OCI_BUDGET_CONFIG;
    IF N<>1 THEN RAISE_APPLICATION_ERROR(-20769,'Exactly one budget source configuration is required'); END IF;
  END;
  L_LOCK_RESULT:=DBMS_LOCK.REQUEST(ID=>C_LOCK_ID,LOCKMODE=>DBMS_LOCK.X_MODE,
    TIMEOUT=>0,RELEASE_ON_COMMIT=>FALSE);
  IF L_LOCK_RESULT=1 THEN
    RAISE_APPLICATION_ERROR(-20769,'Another OCI Budgets synchronization is already running');
  ELSIF L_LOCK_RESULT<>0 THEN
    RAISE_APPLICATION_ERROR(-20769,'OCI Budgets synchronization lock returned '||L_LOCK_RESULT);
  END IF;
  L_LOCKED:=TRUE;
  SELECT * INTO L_CONFIG FROM OCI_BUDGET_CONFIG;
  UPDATE OCI_BUDGET_SYNC_RUN SET STATUS='FAILED',COMPLETED_AT=SYSTIMESTAMP,
    ERROR_CODE=-20769,ERROR_MESSAGE='Previous session ended before publishing a snapshot'
   WHERE STATUS='RUNNING';
  IF L_CONFIG.IS_SYNC_ENABLED='N' AND P_FORCE_RUN=0 THEN
    INSERT INTO OCI_BUDGET_SYNC_RUN(status,tenancy_ocid,home_region,completed_at)
    VALUES('SKIPPED',L_CONFIG.TENANCY_OCID,L_CONFIG.HOME_REGION,SYSTIMESTAMP);
    COMMIT;
    L_LOCK_RESULT:=DBMS_LOCK.RELEASE(ID=>C_LOCK_ID);
    L_LOCKED:=FALSE;
    RETURN;
  END IF;
  INSERT INTO OCI_BUDGET_SYNC_RUN(status,tenancy_ocid,home_region)
  VALUES('RUNNING',L_CONFIG.TENANCY_OCID,L_CONFIG.HOME_REGION)
  RETURNING sync_run_id INTO L_RUN;
  COMMIT;
  SAVEPOINT BUDGET_SNAPSHOT;
  L_SAVED:=TRUE;
  L_ENDPOINT:='https://usage.'||L_CONFIG.HOME_REGION||'.oci.'||FINOPS_CORE_ENDPOINT_DOMAIN()||'/20190111';
  COLLECT_BUDGETS;
  UPDATE OCI_BUDGET_SYNC_RUN SET STATUS='COMPLETED',COMPLETED_AT=SYSTIMESTAMP,
    BUDGETS_READ=L_BUDGETS,ALERT_RULES_READ=L_RULES WHERE SYNC_RUN_ID=L_RUN;
  COMMIT;
  L_LOCK_RESULT:=DBMS_LOCK.RELEASE(ID=>C_LOCK_ID);
  L_LOCKED:=FALSE;
EXCEPTION WHEN OTHERS THEN
  L_CODE:=SQLCODE; L_ERROR:=SUBSTR(SQLERRM,1,4000);
  IF L_SAVED THEN ROLLBACK TO BUDGET_SNAPSHOT; END IF;
  IF L_RUN IS NOT NULL AND L_SAVED THEN
    UPDATE OCI_BUDGET_SYNC_RUN SET STATUS='FAILED',COMPLETED_AT=SYSTIMESTAMP,
      BUDGETS_READ=L_BUDGETS,ALERT_RULES_READ=L_RULES,ERROR_CODE=L_CODE,ERROR_MESSAGE=L_ERROR
     WHERE SYNC_RUN_ID=L_RUN;
    COMMIT;
  ELSIF L_LOCKED THEN ROLLBACK;
  END IF;
  IF L_LOCKED THEN
    L_LOCK_RESULT:=DBMS_LOCK.RELEASE(ID=>C_LOCK_ID);
  END IF;
  RAISE;
END;
/
SHOW ERRORS PROCEDURE oci_sync_budgets

DECLARE N NUMBER;
BEGIN
  SELECT COUNT(*) INTO N FROM USER_ERRORS WHERE NAME='OCI_SYNC_BUDGETS' AND TYPE='PROCEDURE';
  IF N>0 THEN RAISE_APPLICATION_ERROR(-20770,'OCI Budgets procedure compilation failed'); END IF;
END;
/
