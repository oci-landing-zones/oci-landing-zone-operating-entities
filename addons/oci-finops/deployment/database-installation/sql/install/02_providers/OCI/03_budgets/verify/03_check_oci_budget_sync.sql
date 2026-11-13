-- Read-only source-sync report. Run as FOCUSPLATFORM from deployment/sql/install.
SET VERIFY OFF DEFINE OFF SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 210 PAGESIZE 100
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
PROMPT === Latest OCI Budgets source attempt ===
COLUMN STATUS FORMAT A12
COLUMN STARTED_AT FORMAT A32
COLUMN COMPLETED_AT FORMAT A32
COLUMN ERROR_MESSAGE FORMAT A100
SELECT sync_run_id,status,started_at,completed_at,budgets_read,alert_rules_read,error_code,error_message
  FROM oci_budget_sync_run ORDER BY sync_run_id DESC FETCH FIRST 1 ROW ONLY;
PROMPT === Published current budgets (top 30 by amount) ===
COLUMN BUDGET_ID FORMAT A34
COLUMN DISPLAY_NAME FORMAT A34
COLUMN TARGET_TYPE FORMAT A16
SELECT budget_id,display_name,target_type,amount,actual_spend,forecasted_spend,lifecycle_state
  FROM oci_budget_current_v ORDER BY amount DESC NULLS LAST FETCH FIRST 30 ROWS ONLY;
PROMPT === Published counts ===
SELECT (SELECT COUNT(*) FROM oci_budget_current_v) current_budgets,
       (SELECT COUNT(*) FROM oci_budget_alert_rules_v) current_alert_rules
  FROM dual;
PROMPT === Comparison availability ===
SELECT comparison_status,COUNT(*) budgets
  FROM oci_budget_focus_comparison_v GROUP BY comparison_status ORDER BY comparison_status;
PROMPT === Recent Scheduler attempt ===
COLUMN ACTUAL_START_DATE FORMAT A38
COLUMN RUN_DURATION FORMAT A24
SELECT JOB_NAME,STATUS,ACTUAL_START_DATE,RUN_DURATION,ERROR#
  FROM USER_SCHEDULER_JOB_RUN_DETAILS WHERE JOB_NAME='OCI_BUDGET_DAILY'
  ORDER BY LOG_ID DESC FETCH FIRST 1 ROW ONLY;
DECLARE S VARCHAR2(16); E NUMBER; N NUMBER;
BEGIN
  SELECT COUNT(*) INTO N FROM OCI_BUDGET_SYNC_RUN;
  IF N=0 THEN
    DBMS_OUTPUT.PUT_LINE('latest_source=NOT_STARTED');
  ELSE
    SELECT status,error_code INTO S,E FROM
      (SELECT status,error_code FROM oci_budget_sync_run ORDER BY sync_run_id DESC)
     WHERE ROWNUM=1;
    DBMS_OUTPUT.PUT_LINE('latest_source='||S||' error_code='||NVL(TO_CHAR(E),'none'));
  END IF;
END;
/
