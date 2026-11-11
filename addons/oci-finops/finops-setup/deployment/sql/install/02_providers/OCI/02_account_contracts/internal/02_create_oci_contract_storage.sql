-- OneSubscription metadata and immutable observations; no customer PII payloads.
whenever sqlerror exit failure rollback
set define off
create table oci_account_contract_config (
  subscription_id varchar2(256) primary key,
  tenancy_ocid varchar2(512) not null,
  endpoint_region varchar2(64) not null,
  credential_name varchar2(128) default 'OCI$RESOURCE_PRINCIPAL' not null,
  is_sync_enabled char(1) default 'N' not null check(is_sync_enabled in ('Y','N')),
  is_discovered char(1) default 'Y' not null check(is_discovered in ('Y','N')),
  last_discovered_at timestamp with time zone default systimestamp not null
);
create table oci_account_contract_run (
  sync_run_id number generated always as identity primary key,
  subscription_id varchar2(256) not null references oci_account_contract_config(subscription_id),
  started_at timestamp with time zone default systimestamp not null,
  completed_at timestamp with time zone,
  status varchar2(16) not null check(status in ('RUNNING','COMPLETED','FAILED','SKIPPED')),
  services_read number default 0 not null,
  commitments_read number default 0 not null,
  error_code number,
  error_message varchar2(4000)
);
create index oci_account_contract_run_ix on oci_account_contract_run(subscription_id,status,sync_run_id);
create table oci_account_contract_subscription_snap (
  sync_run_id number primary key references oci_account_contract_run(sync_run_id),
  subscription_id varchar2(256) not null,
  status varchar2(64),
  service_name varchar2(512),
  time_start timestamp with time zone,
  time_end timestamp with time zone,
  currency_iso_code varchar2(16),
  observed_at timestamp with time zone default systimestamp not null,
  is_current char(1) default 'Y' not null check(is_current in ('Y','N')),
  last_seen_run_id number not null
);
create table oci_account_contract_service_snap (
  sync_run_id number not null references oci_account_contract_run(sync_run_id),
  service_id varchar2(256) not null,
  subscription_id varchar2(256) not null,
  service_type varchar2(128),
  status varchar2(64),
  product_name varchar2(512),
  product_part_number varchar2(128),
  time_start timestamp with time zone,
  time_end timestamp with time zone,
  quantity_text varchar2(128),
  used_amount_text varchar2(128),
  available_amount_text varchar2(128),
  funded_allocation_text varchar2(128),
  agreement_id number,
  agreement_name varchar2(512),
  billing_frequency varchar2(64),
  observed_at timestamp with time zone default systimestamp not null,
  is_current char(1) default 'Y' not null check(is_current in ('Y','N')),
  last_seen_run_id number not null,
  primary key(sync_run_id,service_id)
);
create table oci_account_contract_commitment_snap (
  sync_run_id number not null references oci_account_contract_run(sync_run_id),
  commitment_id varchar2(256) not null,
  service_id varchar2(256) not null,
  time_start timestamp with time zone,
  time_end timestamp with time zone,
  quantity_text varchar2(128),
  used_amount_text varchar2(128),
  available_amount_text varchar2(128),
  funded_allocation_text varchar2(128),
  observed_at timestamp with time zone default systimestamp not null,
  is_current char(1) default 'Y' not null check(is_current in ('Y','N')),
  last_seen_run_id number not null,
  primary key(sync_run_id,commitment_id)
);
create unique index oci_account_contract_sub_current_uq
  on oci_account_contract_subscription_snap
  (case when is_current='Y' then subscription_id end);
create unique index oci_account_contract_svc_current_uq
  on oci_account_contract_service_snap
  (case when is_current='Y' then subscription_id end,
   case when is_current='Y' then service_id end);
create unique index oci_account_contract_com_current_uq
  on oci_account_contract_commitment_snap
  (case when is_current='Y' then service_id end,
   case when is_current='Y' then commitment_id end);
create or replace view oci_account_contract_current_run_v as
select r.* from oci_account_contract_run r
where r.status='COMPLETED' and r.sync_run_id=(
  select max(x.sync_run_id) from oci_account_contract_run x
  where x.subscription_id=r.subscription_id and x.status='COMPLETED');
create or replace view oci_account_contract_subscription_v as
select s.* from oci_account_contract_subscription_snap s where s.is_current='Y';
create or replace view oci_account_contract_service_v as
select s.* from oci_account_contract_service_snap s where s.is_current='Y';
create or replace view oci_account_contract_commitment_v as
select c.* from oci_account_contract_commitment_snap c where c.is_current='Y';
create or replace view oci_account_contract_health_v as
select c.subscription_id,c.is_sync_enabled,c.endpoint_region,r.sync_run_id,r.status,
       r.started_at,r.completed_at,r.services_read,r.commitments_read,r.error_code,r.error_message,
       (select max(x.completed_at) from oci_account_contract_run x
        where x.subscription_id=c.subscription_id and x.status='COMPLETED') last_success_at
from oci_account_contract_config c left join (
  select x.*,row_number() over(partition by subscription_id order by sync_run_id desc) rn
  from oci_account_contract_run x) r on r.subscription_id=c.subscription_id and r.rn=1;
