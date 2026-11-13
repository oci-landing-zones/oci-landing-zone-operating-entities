-- OCI-owned native Cost Anomaly observations.
whenever sqlerror exit failure rollback
set define off

create table oci_anomaly_config (
  config_id number default 1 primary key check (config_id = 1),
  tenancy_ocid varchar2(512) not null,
  endpoint_region varchar2(64) not null,
  endpoint_domain varchar2(128) default 'oraclecloud.com' not null,
  credential_name varchar2(128) default 'OCI$RESOURCE_PRINCIPAL' not null,
  lookback_days number default 365 not null
    check (lookback_days between 1 and 3660 and lookback_days = trunc(lookback_days)),
  is_sync_enabled char(1) default 'N' not null check (is_sync_enabled in ('Y','N'))
);

create table oci_anomaly_sync_run (
  sync_run_id number generated always as identity primary key,
  started_at timestamp with time zone default systimestamp not null,
  completed_at timestamp with time zone,
  status varchar2(16) not null check (status in ('RUNNING','COMPLETED','FAILED','SKIPPED')),
  tenancy_ocid varchar2(512) not null,
  endpoint_region varchar2(64) not null,
  window_start timestamp with time zone not null,
  window_end timestamp with time zone not null,
  monitors_read number default 0 not null,
  events_read number default 0 not null,
  error_code number,
  error_message varchar2(4000)
);

create table oci_anomaly_monitor_snap (
  sync_run_id number not null references oci_anomaly_sync_run(sync_run_id),
  monitor_id varchar2(512) not null,
  compartment_id varchar2(512) not null,
  monitor_name varchar2(1000),
  monitor_type varchar2(64),
  lifecycle_state varchar2(64),
  lifecycle_details varchar2(4000),
  source_created_at timestamp with time zone,
  source_updated_at timestamp with time zone,
  observed_at timestamp with time zone default systimestamp not null,
  source_payload clob not null check (source_payload is json),
  primary key(sync_run_id,monitor_id)
);

create table oci_anomaly_event_snap (
  sync_run_id number not null references oci_anomaly_sync_run(sync_run_id),
  event_id varchar2(512) not null,
  compartment_id varchar2(512) not null,
  event_name varchar2(1000),
  monitor_id varchar2(512) not null,
  monitor_name varchar2(1000),
  monitor_type varchar2(64),
  lifecycle_state varchar2(64),
  event_date timestamp with time zone not null,
  cost_impact number,
  cost_variance_percentage number,
  actual_total_cost number,
  expected_total_cost number,
  root_total_cost_impact number,
  feedback_response varchar2(256),
  source_created_at timestamp with time zone,
  source_updated_at timestamp with time zone,
  observed_at timestamp with time zone default systimestamp not null,
  source_payload clob not null check (source_payload is json),
  root_cause_payload clob check (root_cause_payload is json),
  primary key(sync_run_id,event_id)
);

create index oci_anomaly_event_id_ix on oci_anomaly_event_snap(event_id,sync_run_id);

create or replace view oci_anomaly_monitors_v as
select m.* from oci_anomaly_monitor_snap m
where m.sync_run_id = (select max(sync_run_id) from oci_anomaly_sync_run where status='COMPLETED');

create or replace view oci_anomaly_history_v as
select e.*, r.tenancy_ocid as source_tenancy_ocid, r.endpoint_region,
       r.window_start, r.window_end,
       cast(null as varchar2(30)) as currency_code,
       'NOT_PROVIDED_BY_API' as currency_status,
       case when actual_total_cost is null or expected_total_cost is null or cost_impact is null
              then 'INCOMPLETE_SOURCE_TOTALS'
            when abs(actual_total_cost-expected_total_cost-cost_impact)>0.01
              or abs(root_total_cost_impact-cost_impact)>0.01
              then 'INCONSISTENT_SOURCE_TOTALS'
            else 'SOURCE_TOTALS_CONSISTENT' end as source_quality_status
from oci_anomaly_event_snap e join oci_anomaly_sync_run r on r.sync_run_id=e.sync_run_id
where r.status='COMPLETED';

-- Latest known event, even when it ages out of the rolling retrieval window.
-- Absence is not resolution. Use the observation flag before interpreting age.
create or replace view oci_anomaly_events_v as
select h.*,
       case when h.sync_run_id=(select max(sync_run_id) from oci_anomaly_sync_run where status='COMPLETED')
            then 'Y' else 'N' end as observed_in_latest_run
from oci_anomaly_history_v h
where h.sync_run_id=(select max(e.sync_run_id) from oci_anomaly_event_snap e
                    join oci_anomaly_sync_run r on r.sync_run_id=e.sync_run_id
                    where e.event_id=h.event_id and r.status='COMPLETED');

create or replace view oci_anomaly_health_v as
select c.config_id,c.is_sync_enabled,c.lookback_days,c.endpoint_region,
       r.sync_run_id,r.status,r.started_at,r.completed_at,r.monitors_read,r.events_read,
       r.error_code,r.error_message,
       (select max(completed_at) from oci_anomaly_sync_run where status='COMPLETED') last_success_at
from oci_anomaly_config c left join
  (select * from oci_anomaly_sync_run
   where sync_run_id=(select max(sync_run_id) from oci_anomaly_sync_run)) r on 1=1;

comment on table oci_anomaly_events_v is 'Latest known OCI event; absence from a bounded sync does not imply resolution. Currency is not supplied by the API.';
comment on table oci_anomaly_monitor_snap is 'Full GET monitor details, including lifecycle explanation and filters, for each successful observation.';
