-- OCI provider views over successful Cloud Advisor observations.
whenever sqlerror exit failure rollback
set define off

declare
  n number;
begin
  select count(*) into n from oci_advisor_config;
  if n > 1 then
    raise_application_error(-20082, 'Resolve multiple Advisor configurations before upgrading.');
  end if;
  select count(*) into n from user_indexes where index_name = 'OCI_ADVISOR_CONFIG_SINGLE_UQ';
  if n = 0 then
    execute immediate 'create unique index oci_advisor_CONFIG_SINGLE_UQ on oci_advisor_CONFIG (1)';
  end if;
end;
/

create or replace view oci_advisor_RECOMMENDATIONS_V as
select r.* from oci_advisor_recommendation r
where r.last_seen_run_id = (
  select max(sync_run_id) from oci_advisor_sync_run where status = 'COMPLETED'
);

create or replace view oci_advisor_ACTIONS_V as
select a.* from oci_advisor_resource_action a
where a.last_seen_run_id = (
  select max(sync_run_id) from oci_advisor_sync_run where status = 'COMPLETED'
);

-- Compatibility views now have the same current-snapshot semantics.
create or replace view oci_advisor_RECOMMENDATION_CURRENT as
select r.* from oci_advisor_RECOMMENDATIONS_V r;

create or replace view oci_advisor_OPEN_ACTIONS_V as
select a.resource_action_id, a.recommendation_id, r.recommendation_name,
       r.importance, r.recommendation_status, a.resource_ocid, a.resource_name,
       a.resource_type, a.resource_region, a.compartment_id, a.compartment_name,
       a.action_type, a.action_description, a.action_url, a.estimated_cost_saving,
       a.currency_code, a.time_status_begin, a.source_updated_at
from oci_advisor_ACTIONS_V a
left join oci_advisor_RECOMMENDATIONS_V r on r.recommendation_id = a.recommendation_id
where a.action_status = 'PENDING' and a.lifecycle_state = 'ACTIVE';

create or replace view oci_advisor_OBSERVATIONS_V as
select s.sync_run_id, 'RECOMMENDATION' entity_kind, s.recommendation_id entity_id,
       cast(null as varchar2(512)) recommendation_id,
       cast(null as varchar2(512)) resource_ocid,
       s.recommendation_status observed_status, s.lifecycle_state,
       s.estimated_cost_saving, s.currency_code
from oci_advisor_recommendation_snap s
join oci_advisor_sync_run r on r.sync_run_id = s.sync_run_id and r.status = 'COMPLETED'
union all
select s.sync_run_id, 'ACTION', s.resource_action_id, s.recommendation_id,
       s.resource_ocid, s.action_status, s.lifecycle_state, s.estimated_cost_saving, s.currency_code
from oci_advisor_resource_action_snap s
join oci_advisor_sync_run r on r.sync_run_id = s.sync_run_id and r.status = 'COMPLETED';

create or replace view oci_advisor_CHANGES_V as
with runs as (
  select sync_run_id, completed_at,
         lag(sync_run_id) over (order by sync_run_id) previous_run_id
  from oci_advisor_sync_run where status = 'COMPLETED'
), previous_observations as (
  select r.sync_run_id comparison_run_id, o.*
  from runs r join oci_advisor_OBSERVATIONS_V o on o.sync_run_id = r.previous_run_id
), compared as (
  select coalesce(c.sync_run_id,p.comparison_run_id) sync_run_id,
         coalesce(c.entity_kind,p.entity_kind) entity_kind,
         coalesce(c.entity_id,p.entity_id) entity_id,
         coalesce(c.resource_ocid,p.resource_ocid) resource_ocid,
         coalesce(c.recommendation_id,p.recommendation_id) recommendation_id,
         p.observed_status previous_status, c.observed_status current_status,
         p.lifecycle_state previous_lifecycle, c.lifecycle_state current_lifecycle,
         p.estimated_cost_saving previous_estimate, c.estimated_cost_saving current_estimate,
         p.currency_code previous_currency, c.currency_code current_currency,
         case when c.entity_id is null then 'NO_LONGER_OBSERVED'
              when p.entity_id is null then
                case when exists (
                  select 1 from oci_advisor_OBSERVATIONS_V older
                  where older.entity_kind = c.entity_kind and older.entity_id = c.entity_id
                    and older.sync_run_id < c.sync_run_id
                ) then 'REAPPEARED' else 'NEW' end
              else 'CHANGED' end change_kind
  from oci_advisor_OBSERVATIONS_V c
  full outer join previous_observations p
    on p.comparison_run_id = c.sync_run_id and p.entity_kind = c.entity_kind and p.entity_id = c.entity_id
  where c.entity_id is null or p.entity_id is null
     or decode(c.observed_status,p.observed_status,0,1) = 1
     or decode(c.lifecycle_state,p.lifecycle_state,0,1) = 1
     or decode(c.estimated_cost_saving,p.estimated_cost_saving,0,1) = 1
     or decode(c.currency_code,p.currency_code,0,1) = 1
     or decode(c.resource_ocid,p.resource_ocid,0,1) = 1
     or decode(c.recommendation_id,p.recommendation_id,0,1) = 1
)
select c.*, r.previous_run_id, r.completed_at observed_at
from compared c join runs r on r.sync_run_id = c.sync_run_id;

create or replace view oci_advisor_HEALTH_V as
select c.config_id, c.endpoint_region, c.is_sync_enabled,
       (select max(completed_at) from oci_advisor_sync_run where status='COMPLETED') last_success_at,
       (select count(*) from oci_advisor_sync_run where status='RUNNING') running_count,
       (select count(*) from oci_advisor_RECOMMENDATIONS_V) current_recommendations,
       (select count(*) from oci_advisor_ACTIONS_V) current_actions,
       case when exists (select 1 from oci_advisor_sync_run
                          where status='COMPLETED' and completed_at > systimestamp - interval '36' hour)
            then 'FRESH' else 'STALE' end freshness,
       (select enabled from user_scheduler_jobs where job_name='OCI_ADVISOR_DAILY') job_enabled
from oci_advisor_config c;

comment on table oci_advisor_ACTIONS_V is 'Real Cloud Advisor actions observed in the latest completed snapshot';
comment on table oci_advisor_CHANGES_V is 'Observed changes between consecutive completed snapshots; absence is not evidence of implementation or realized savings';

declare
  n number;
begin
  select count(*) into n from user_objects
  where object_name like 'OCI_ADVISOR_%'
    and status <> 'VALID';
  if n > 0 then raise_application_error(-20087, 'Advisor view validation failed.'); end if;
end;
/
