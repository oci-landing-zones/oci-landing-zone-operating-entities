-- Filtered read-only entry point. Initialize fp_install_config once before calling.
SET DEFINE OFF VERIFY OFF
VARIABLE fp_status_module_ids CLOB
VARIABLE fp_status_detail VARCHAR2(5)
BEGIN :fp_status_detail := NVL(JSON_VALUE(:fp_install_config,'$.status_detail'),'LONG'); END;
/
BEGIN
  SELECT NVL(JSON_QUERY(:fp_install_config, '$.status_module_ids' RETURNING CLOB),TO_CLOB('["ALL"]'))
    INTO :fp_status_module_ids FROM DUAL;
END;
/
@@internal/module_status_report.sql
