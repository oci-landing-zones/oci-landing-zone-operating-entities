-- Caller must initialize the session binds and assign its JSON before invoking modules.
SET DEFINE OFF
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE
  J JSON_OBJECT_T := JSON_OBJECT_T.PARSE(:fp_install_config);
BEGIN
  J.ON_ERROR(1);
  IF J.GET_NUMBER('schema_version')<>1 THEN
    RAISE_APPLICATION_ERROR(-20900,'Unsupported module input schema_version');
  END IF;
  IF J.HAS('installation_mode') THEN
    IF J.GET_STRING('installation_mode') IS NULL OR J.GET_STRING('installation_mode') NOT IN ('LANDING_ZONE','STANDALONE') THEN
      RAISE_APPLICATION_ERROR(-20900,'installation_mode must be LANDING_ZONE or STANDALONE');
    END IF;
  END IF;
END;
/
