-- Read-only running-state verification; session parameters only are changed.
SET DEFINE OFF VERIFY OFF
-- The caller initializes fp_install_config once; redeclaration invalidates its LOB locator.
BEGIN
  SELECT JSON_MERGEPATCH(NVL(:fp_install_config, TO_CLOB('{"schema_version":1}')),
                        '{"ingestion_expected_state":"STARTED"}' RETURNING CLOB)
    INTO :fp_install_config FROM DUAL;
END;
/
@@00_verify_oci_ingestion.sql
