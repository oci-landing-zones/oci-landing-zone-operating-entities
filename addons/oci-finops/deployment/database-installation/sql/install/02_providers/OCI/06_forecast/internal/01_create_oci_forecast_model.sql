-- OCI Usage API actuals/forecast vintages. No synthetic or FOCUS inputs.
whenever sqlerror exit failure rollback
set define off
create table oci_forecast_config (
  config_id number default 1 primary key check(config_id=1),
  tenancy_ocid varchar2(512) not null,
  endpoint_region varchar2(64) not null,
  endpoint_domain varchar2(128) not null,
  credential_name varchar2(128) default 'OCI$RESOURCE_PRINCIPAL' not null,
  history_days number default 60 not null check(history_days between 31 and 90 and history_days=trunc(history_days)),
  horizon_days number default 30 not null check(horizon_days between 1 and 60 and horizon_days=trunc(horizon_days)),
  is_sync_enabled char(1) default 'N' not null check(is_sync_enabled in ('Y','N'))
);
create table oci_forecast_run (
  sync_run_id number generated always as identity primary key,
  started_at timestamp with time zone default systimestamp not null,
  completed_at timestamp with time zone,
  status varchar2(16) not null check(status in ('RUNNING','COMPLETED','FAILED','SKIPPED')),
  forecast_origin varchar2(32) default 'OCI_USAGE_API_BASIC' not null,
  tenancy_ocid varchar2(512) not null,
  endpoint_region varchar2(64) not null,
  as_of_day date not null,
  history_start date not null,
  actual_end date not null,
  horizon_end date not null,
  forecast_end date not null,
  actual_rows number default 0 not null,
  forecast_rows number default 0 not null,
  error_code number,
  error_message varchar2(4000)
);
create table oci_forecast_request (
  sync_run_id number not null references oci_forecast_run(sync_run_id),
  query_level varchar2(16) not null check(query_level in ('TENANCY','SERVICE')),
  request_kind varchar2(16) not null check(request_kind in ('ACTUAL','FORECAST')),
  chunk_no number not null,
  request_payload clob not null check(request_payload is json),
  pages_read number default 0 not null,
  points_stored number default 0 not null,
  primary key(sync_run_id,query_level,request_kind,chunk_no)
);
create table oci_forecast_point (
  point_id number generated always as identity primary key,
  sync_run_id number not null references oci_forecast_run(sync_run_id),
  query_level varchar2(16) not null check(query_level in ('TENANCY','SERVICE')),
  point_kind varchar2(16) not null check(point_kind in ('ACTUAL','FORECAST')),
  tenant_id varchar2(512) not null,
  service_name varchar2(512),
  currency_code varchar2(32),
  period_start date not null,
  period_end date not null,
  amount number,
  source_payload clob not null check(source_payload is json),
  check(period_end=period_start+1 and period_start=trunc(period_start))
);
create unique index oci_forecast_grain_uq on oci_forecast_point
  (sync_run_id,query_level,point_kind,tenant_id,nvl(service_name,chr(0)),nvl(currency_code,chr(0)),period_start);
create or replace view oci_forecast_current_v as
select p.*,r.as_of_day,r.actual_end,r.forecast_origin from oci_forecast_point p
join oci_forecast_run r on r.sync_run_id=p.sync_run_id
where r.sync_run_id=(select max(sync_run_id) from oci_forecast_run where status='COMPLETED');
create or replace view oci_forecast_summary_v as
with totals as (
  select r.sync_run_id,r.as_of_day,r.actual_end,r.horizon_end,r.forecast_end,
    p.query_level,p.tenant_id,p.service_name,p.currency_code,
    count(case when p.point_kind='ACTUAL' and p.amount is not null then 1 end) actual_days,
    count(case when p.point_kind='ACTUAL' and p.amount<>0 then 1 end) nonzero_actual_days,
    count(case when p.period_start>=r.as_of_day and p.period_end<=r.horizon_end and p.amount is not null then 1 end) horizon_days,
    sum(case when p.period_start>=r.as_of_day and p.period_end<=r.horizon_end then p.amount end) horizon_amount_raw,
    count(case when p.period_start>=trunc(r.as_of_day,'MM') and p.period_end<=add_months(trunc(r.as_of_day,'MM'),1) and p.amount is not null then 1 end) month_days,
    sum(case when p.period_start>=trunc(r.as_of_day,'MM') and p.period_end<=add_months(trunc(r.as_of_day,'MM'),1) and p.point_kind='ACTUAL' then p.amount else 0 end) month_actual_observed,
    sum(case when p.period_start>=trunc(r.as_of_day,'MM') and p.period_end<=add_months(trunc(r.as_of_day,'MM'),1) and p.point_kind='FORECAST' then p.amount else 0 end) month_forecast_observed
  from oci_forecast_run r join oci_forecast_point p on p.sync_run_id=r.sync_run_id
  where r.status='COMPLETED'
  group by r.sync_run_id,r.as_of_day,r.actual_end,r.horizon_end,r.forecast_end,
    p.query_level,p.tenant_id,p.service_name,p.currency_code
), quality as (
  select t.*,
    case when currency_code is null then 'MISSING_CURRENCY'
         when actual_days<10 then 'INSUFFICIENT_ACTUAL_HISTORY'
         when nonzero_actual_days=0 then 'ZERO_ACTUAL_HISTORY'
         else 'HISTORY_AVAILABLE' end history_status
  from totals t
)
select q.*,
  case when history_status<>'HISTORY_AVAILABLE' then history_status
       when horizon_days<>horizon_end-as_of_day then 'INCOMPLETE_FORECAST_COVERAGE'
       else 'AVAILABLE' end horizon_status,
  case when history_status='HISTORY_AVAILABLE' and horizon_days=horizon_end-as_of_day
       then horizon_amount_raw end horizon_estimate,
  case when history_status<>'HISTORY_AVAILABLE' then history_status
       when month_days<>add_months(trunc(as_of_day,'MM'),1)-trunc(as_of_day,'MM') then 'INCOMPLETE_MONTH_COVERAGE'
       else 'AVAILABLE' end month_status,
  case when history_status='HISTORY_AVAILABLE' and month_days=add_months(trunc(as_of_day,'MM'),1)-trunc(as_of_day,'MM')
       then month_actual_observed+month_forecast_observed end month_estimate
from quality q;
create or replace view oci_forecast_latest_summary_v as
select * from oci_forecast_summary_v
where sync_run_id=(select max(sync_run_id) from oci_forecast_run where status='COMPLETED');
create or replace view oci_forecast_error_v as
select f.sync_run_id forecast_run_id,f.period_start,f.query_level,f.tenant_id,f.service_name,f.currency_code,
       f.amount forecast_amount,a.amount observed_actual_amount,a.sync_run_id actual_run_id,
       a.amount-f.amount signed_error,abs(a.amount-f.amount) absolute_error,
       case when a.amount<>0 then abs(a.amount-f.amount)/abs(a.amount)*100 end absolute_percentage_error
from oci_forecast_point f join oci_forecast_run r on r.sync_run_id=f.sync_run_id
join oci_forecast_current_v a on a.point_kind='ACTUAL' and a.period_start=f.period_start
 and a.query_level=f.query_level and a.tenant_id=f.tenant_id
 and decode(a.service_name,f.service_name,1,0)=1 and a.currency_code=f.currency_code
where r.status='COMPLETED' and f.point_kind='FORECAST' and f.sync_run_id<a.sync_run_id
  and a.amount is not null and f.amount is not null;
create or replace view oci_forecast_health_v as
select c.is_sync_enabled,c.history_days,c.horizon_days,r.*,
       case when r.status<>'COMPLETED' then 'CHECK_RUN_STATUS'
            when r.actual_rows=0 then 'NO_ACTUAL_DATA'
            when r.forecast_rows=0 then 'NO_FORECAST_DATA'
            else 'CHECK_SERIES_COVERAGE' end data_status,
       (select max(completed_at) from oci_forecast_run where status='COMPLETED') last_success_at
from oci_forecast_config c left join
 (select * from oci_forecast_run where sync_run_id=(select max(sync_run_id) from oci_forecast_run)) r on 1=1;
