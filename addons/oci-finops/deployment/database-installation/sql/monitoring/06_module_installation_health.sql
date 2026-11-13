-- All-module entry point for the shared read-only report.
SET DEFINE OFF VERIFY OFF
VARIABLE fp_status_module_ids CLOB
VARIABLE fp_status_detail VARCHAR2(5)
BEGIN :fp_status_detail := 'LONG'; END;
/
BEGIN :fp_status_module_ids := '["ALL"]'; END;
/
@@internal/module_status_report.sql
