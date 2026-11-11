-- Publish a fully built and validated candidate after explicit review.
-- This script is intentionally separate from the candidate-build request.
SET ECHO OFF VERIFY OFF DEFINE OFF SERVEROUTPUT ON SIZE UNLIMITED
WHENEVER OSERROR EXIT FAILURE
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

BEGIN
  IF SYS_CONTEXT('USERENV','SESSION_USER')<>'FOCUSPLATFORM' OR
     SYS_CONTEXT('USERENV','CURRENT_SCHEMA')<>'FOCUSPLATFORM' THEN
    RAISE_APPLICATION_ERROR(-20609,'Connect as FOCUSPLATFORM');
  END IF;
  OAC_OCI_FOCUS_COST_DETAIL_API.PUBLISH_READY(
    JSON_VALUE(:fp_install_config,'$.candidate_run_id' RETURNING NUMBER ERROR ON ERROR));
END;
/

@03_visualization/OAC/verify/00_check_oac_oci_focus_cost_detail.sql
