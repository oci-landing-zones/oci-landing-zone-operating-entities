-- OCI Budget definitions and alert rules are retained as immutable run snapshots.
WHENEVER SQLERROR EXIT FAILURE ROLLBACK
SET DEFINE OFF

CREATE TABLE oci_budget_config (
  config_id NUMBER DEFAULT 1 PRIMARY KEY CHECK(config_id=1),
  tenancy_ocid VARCHAR2(512) NOT NULL,
  home_region VARCHAR2(64) NOT NULL,
  credential_name VARCHAR2(128) DEFAULT 'OCI$RESOURCE_PRINCIPAL' NOT NULL,
  is_sync_enabled CHAR(1) DEFAULT 'N' NOT NULL CHECK(is_sync_enabled IN ('Y','N')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE TABLE oci_budget_sync_run (
  sync_run_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR2(16) NOT NULL CHECK(status IN ('RUNNING','COMPLETED','FAILED','SKIPPED')),
  tenancy_ocid VARCHAR2(512) NOT NULL,
  home_region VARCHAR2(64) NOT NULL,
  budgets_read NUMBER DEFAULT 0 NOT NULL,
  alert_rules_read NUMBER DEFAULT 0 NOT NULL,
  error_code NUMBER,
  error_message VARCHAR2(4000)
);
CREATE INDEX oci_budget_sync_run_status_ix ON oci_budget_sync_run(status,sync_run_id);

CREATE TABLE oci_budget_snap (
  sync_run_id NUMBER NOT NULL REFERENCES oci_budget_sync_run(sync_run_id),
  budget_id VARCHAR2(512) NOT NULL,
  compartment_id VARCHAR2(512) NOT NULL,
  target_compartment_id VARCHAR2(512),
  display_name VARCHAR2(1000),
  description VARCHAR2(4000),
  lifecycle_state VARCHAR2(64),
  amount NUMBER,
  actual_spend NUMBER,
  forecasted_spend NUMBER,
  alert_rule_count NUMBER,
  reset_period VARCHAR2(64),
  processing_period_type VARCHAR2(64),
  processing_period_start_offset NUMBER,
  target_type VARCHAR2(64),
  targets_json CLOB CHECK(targets_json IS JSON),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  time_spend_computed TIMESTAMP WITH TIME ZONE,
  source_created_at TIMESTAMP WITH TIME ZONE,
  source_updated_at TIMESTAMP WITH TIME ZONE,
  observed_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  source_payload CLOB NOT NULL CHECK(source_payload IS JSON),
  CONSTRAINT oci_budget_snap_pk PRIMARY KEY(sync_run_id,budget_id)
);
CREATE INDEX oci_budget_snap_id_ix ON oci_budget_snap(budget_id,sync_run_id);

CREATE TABLE oci_budget_alert_rule_snap (
  sync_run_id NUMBER NOT NULL,
  budget_id VARCHAR2(512) NOT NULL,
  alert_rule_id VARCHAR2(512) NOT NULL,
  display_name VARCHAR2(1000),
  lifecycle_state VARCHAR2(64),
  rule_type VARCHAR2(64),
  threshold_type VARCHAR2(64),
  threshold NUMBER,
  recipients_json CLOB CHECK(recipients_json IS JSON),
  message VARCHAR2(4000),
  source_created_at TIMESTAMP WITH TIME ZONE,
  source_updated_at TIMESTAMP WITH TIME ZONE,
  observed_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  source_payload CLOB NOT NULL CHECK(source_payload IS JSON),
  CONSTRAINT oci_budget_alert_rule_snap_pk PRIMARY KEY(sync_run_id,alert_rule_id),
  CONSTRAINT oci_budget_alert_rule_run_fk FOREIGN KEY(sync_run_id,budget_id)
    REFERENCES oci_budget_snap(sync_run_id,budget_id)
);
CREATE INDEX oci_budget_alert_id_ix ON oci_budget_alert_rule_snap(alert_rule_id,sync_run_id);

CREATE OR REPLACE VIEW oci_budget_current_v AS
SELECT B.*,R.tenancy_ocid AS source_tenancy_ocid,R.home_region
  FROM oci_budget_snap B JOIN oci_budget_sync_run R ON R.sync_run_id=B.sync_run_id
 WHERE R.status='COMPLETED'
   AND R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run WHERE status='COMPLETED');

CREATE OR REPLACE VIEW oci_budget_alert_rules_v AS
SELECT A.* FROM oci_budget_alert_rule_snap A
 WHERE A.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run WHERE status='COMPLETED');

CREATE OR REPLACE VIEW oci_budget_focus_comparison_v AS
SELECT B.sync_run_id,B.budget_id,B.display_name,B.target_type,B.targets_json,
       B.amount,B.actual_spend,B.forecasted_spend,
       CAST(NULL AS NUMBER) AS focus_billed_cost,
       CAST(NULL AS VARCHAR2(3)) AS billing_currency,
       CASE WHEN B.target_type='COMPARTMENT' THEN 'NOT_COMPARABLE_CURRENCY_NOT_EXPOSED_BY_BUDGET_API'
            WHEN B.target_type='TAG' THEN 'NOT_COMPARABLE_TAG_TARGET_RESOLUTION_REQUIRED'
            ELSE 'NOT_COMPARABLE_UNSUPPORTED_TARGET_TYPE' END AS comparison_status
  FROM oci_budget_current_v B;

CREATE OR REPLACE VIEW oci_budget_health_v AS
SELECT C.config_id,C.is_sync_enabled,C.tenancy_ocid,C.home_region,
       (SELECT R.sync_run_id FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) sync_run_id,
       (SELECT R.status FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) status,
       (SELECT R.started_at FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) started_at,
       (SELECT R.completed_at FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) completed_at,
       (SELECT R.budgets_read FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) budgets_read,
       (SELECT R.alert_rules_read FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) alert_rules_read,
       (SELECT R.error_code FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) error_code,
       (SELECT R.error_message FROM oci_budget_sync_run R
         WHERE R.sync_run_id=(SELECT MAX(sync_run_id) FROM oci_budget_sync_run)) error_message,
       (SELECT MAX(completed_at) FROM oci_budget_sync_run WHERE status='COMPLETED') last_success_at
  FROM oci_budget_config C;

COMMENT ON TABLE oci_budget_snap IS 'Immutable full OCI Budget details captured per successful source run.';
COMMENT ON TABLE oci_budget_alert_rule_snap IS 'Immutable OCI Budget alert-rule details captured per successful source run.';
COMMENT ON TABLE oci_budget_focus_comparison_v IS 'Keeps API spend distinct; comparison is explicitly unavailable until currency and target alignment can be proven.';
