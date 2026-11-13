-- Run once per SQL*Plus session, BEFORE assigning parameters and running modules.
-- This file intentionally initializes inputs; do not call it after assigning them.
SET ECHO OFF VERIFY OFF DEFINE OFF
VARIABLE fp_install_config CLOB
VARIABLE fp_focus_password VARCHAR2(4000)
VARIABLE fp_reader_password VARCHAR2(4000)
BEGIN
  :fp_install_config := '{"schema_version":1}';
  :fp_focus_password := NULL;
  :fp_reader_password := NULL;
END;
/
