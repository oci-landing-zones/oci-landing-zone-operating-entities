-- Persist the endpoint domain resolved by the OCI SDK for the authenticated tenancy.
-- Preflights use the same JSON input before Common Core has been installed.
SET DEFINE OFF VERIFY OFF SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE
  L_DOMAIN VARCHAR2(255) := LOWER(
    JSON_VALUE(:fp_install_config,'$.oci_realm_domain' ERROR ON ERROR));
BEGIN
  IF L_DOMAIN IS NULL OR
     NOT REGEXP_LIKE(L_DOMAIN,'^[a-z0-9]+([.-][a-z0-9]+)*$') THEN
    RAISE_APPLICATION_ERROR(-20990,
      'Missing or invalid tenancy realm domain; run Python configuration');
  END IF;
  EXECUTE IMMEDIATE
    'CREATE FUNCTION FINOPS_CORE_ENDPOINT_DOMAIN RETURN VARCHAR2 AUTHID DEFINER ' ||
    'IS BEGIN RETURN ' || CHR(39) || L_DOMAIN || CHR(39) || '; END;';
END;
/
