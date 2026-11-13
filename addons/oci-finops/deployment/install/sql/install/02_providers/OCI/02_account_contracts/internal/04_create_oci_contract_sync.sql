-- The OCI SDK response types are usable in anonymous PL/SQL but lack direct
-- grants for stored PL/SQL in the tested ADB. Execute that read/insert block dynamically.
whenever sqlerror exit failure rollback
set define off
create or replace procedure oci_sync_contract(
  p_subscription_id varchar2, p_force_run number default 0, p_page_size number default 500)
authid current_user as
  c oci_account_contract_config%rowtype;
  run_id number;
  service_count number;
  commitment_count number;
  err number;
  msg varchar2(4000);
  locked boolean:=false;
  started boolean:=false;
  procedure start_run is
    pragma autonomous_transaction;
  begin
    insert into oci_account_contract_run(subscription_id,status)
      values(c.subscription_id,'RUNNING') returning sync_run_id into run_id;
    commit;
  end;
begin
  if p_subscription_id is null or p_force_run is null or p_force_run not in (0,1)
     or p_page_size is null or p_page_size<>trunc(p_page_size)
     or p_page_size not between 1 and 1000 then
    raise_application_error(-20310,'Invalid subscription, force flag or page size');
  end if;
  select * into c from oci_account_contract_config
    where subscription_id=p_subscription_id for update nowait;
  locked:=true;
  if not regexp_like(c.endpoint_region,'^[a-z0-9]+(-[a-z0-9]+)+$') then
    raise_application_error(-20310,'Invalid OneSubscription region');
  end if;
  update oci_account_contract_run set status='FAILED',completed_at=systimestamp,
    error_code=-20311,error_message='Previous session ended before publishing a snapshot'
    where subscription_id=c.subscription_id and status='RUNNING';
  if c.is_sync_enabled='N' and p_force_run=0 then
    insert into oci_account_contract_run(subscription_id,status,completed_at)
      values(c.subscription_id,'SKIPPED',systimestamp);
    commit;
    return;
  end if;
  start_run;
  started:=true;
  execute immediate q'~declare
    cfg oci_account_contract_config%rowtype;
    s dbms_cloud_oci_os_subscription_list_subscriptions_response_t;
    sv dbms_cloud_oci_os_subscribed_service_list_subscribed_services_response_t;
    cm dbms_cloud_oci_os_commitment_list_commitments_response_t;
    sub_page varchar2(4000);
    service_page varchar2(4000);
    commitment_page varchar2(4000);
    next_token varchar2(4000);
    subscription_count number:=0;
    service_count number:=0;
    commitment_count number:=0;
    retry_count number;
    type token_set is table of boolean index by varchar2(4000);
    seen_sub token_set;
    seen_service token_set;
    seen_commitment token_set;
    function next_page(h json_object_t) return varchar2 is
      keys json_key_list;
    begin
      if h is null then return null; end if;
      keys:=h.get_keys;
      for i in 1..keys.count loop
        if lower(keys(i))='opc-next-page' then return h.get_string(keys(i)); end if;
      end loop;
      return null;
    end;
  begin
    select * into cfg from oci_account_contract_config where subscription_id=:subscription_id;
    loop
      retry_count:=0;
      loop
        retry_count:=retry_count+1;
        begin
          s:=dbms_cloud_oci_os_subscription.list_subscriptions(
            compartment_id=>cfg.tenancy_ocid,subscription_id=>cfg.subscription_id,
            is_commit_info_required=>1,limit=>:page_size,page=>sub_page,
            region=>cfg.endpoint_region,credential_name=>cfg.credential_name);
          if s.status_code=404 then
            raise_application_error(-20404,'OneSubscription subscription HTTP 404');
          end if;
          if s.status_code<>200 or s.response_body is null then
            raise_application_error(-20312,
              'OneSubscription subscription HTTP '||s.status_code);
          end if;
          exit;
        exception when others then
          if sqlcode<>-20404 or retry_count>=3 then raise; end if;
          dbms_output.put_line('subscription read 404; retry '||retry_count);
          dbms_lock.sleep(retry_count);
        end;
      end loop;
      for i in 1..s.response_body.count loop
        subscription_count:=subscription_count+1;
        if subscription_count>1 then raise_application_error(-20312,'Subscription filter returned multiple rows'); end if;
        update oci_account_contract_subscription_snap p set last_seen_run_id=:run_id
        where p.subscription_id=cfg.subscription_id and p.is_current='Y'
          and decode(p.status,s.response_body(i).status,0,1)=0
          and decode(p.service_name,s.response_body(i).service_name,0,1)=0
          and decode(p.time_start,s.response_body(i).time_start,0,1)=0
          and decode(p.time_end,s.response_body(i).time_end,0,1)=0
          and decode(p.currency_iso_code,
            case when s.response_body(i).currency is not null
                 then s.response_body(i).currency.iso_code end,0,1)=0;
        if sql%rowcount=0 then
          update oci_account_contract_subscription_snap set is_current='N'
            where subscription_id=cfg.subscription_id and is_current='Y';
          insert into oci_account_contract_subscription_snap(sync_run_id,subscription_id,status,
            service_name,time_start,time_end,currency_iso_code,last_seen_run_id)
          values(:run_id,cfg.subscription_id,s.response_body(i).status,
            s.response_body(i).service_name,s.response_body(i).time_start,s.response_body(i).time_end,
            case when s.response_body(i).currency is not null
                 then s.response_body(i).currency.iso_code end,:run_id);
        end if;
      end loop;
      next_token:=next_page(s.headers);
      exit when next_token is null;
      if seen_sub.exists(next_token) then raise_application_error(-20312,'Repeated subscription page'); end if;
      seen_sub(next_token):=true;
      sub_page:=next_token;
    end loop;
    if subscription_count<>1 then raise_application_error(-20312,'Subscription not found'); end if;
    loop
      retry_count:=0;
      loop
        retry_count:=retry_count+1;
        begin
          sv:=dbms_cloud_oci_os_subscribed_service.list_subscribed_services(
            compartment_id=>cfg.tenancy_ocid,subscription_id=>cfg.subscription_id,
            limit=>:page_size,page=>service_page,region=>cfg.endpoint_region,
            credential_name=>cfg.credential_name);
          if sv.status_code=404 then
            raise_application_error(-20404,'OneSubscription services HTTP 404');
          end if;
          if sv.status_code<>200 or sv.response_body is null then
            raise_application_error(-20313,
              'OneSubscription services HTTP '||sv.status_code);
          end if;
          exit;
        exception when others then
          if sqlcode<>-20404 or retry_count>=3 then raise; end if;
          dbms_output.put_line('service read 404; retry '||retry_count);
          dbms_lock.sleep(retry_count);
        end;
      end loop;
      for i in 1..sv.response_body.count loop
        if sv.response_body(i).id is null or sv.response_body(i).subscription_id<>cfg.subscription_id then
          raise_application_error(-20313,'Service identity does not match subscription');
        end if;
        update oci_account_contract_service_snap p set last_seen_run_id=:run_id
        where p.service_id=sv.response_body(i).id and p.subscription_id=cfg.subscription_id
          and p.is_current='Y'
          and decode(p.service_type,sv.response_body(i).l_type,0,1)=0
          and decode(p.status,sv.response_body(i).status,0,1)=0
          and decode(p.product_name,case when sv.response_body(i).product is not null
            then sv.response_body(i).product.name end,0,1)=0
          and decode(p.product_part_number,case when sv.response_body(i).product is not null
            then sv.response_body(i).product.part_number end,0,1)=0
          and decode(p.time_start,sv.response_body(i).time_start,0,1)=0
          and decode(p.time_end,sv.response_body(i).time_end,0,1)=0
          and decode(p.quantity_text,sv.response_body(i).quantity,0,1)=0
          and decode(p.used_amount_text,sv.response_body(i).used_amount,0,1)=0
          and decode(p.available_amount_text,sv.response_body(i).available_amount,0,1)=0
          and decode(p.funded_allocation_text,sv.response_body(i).funded_allocation_value,0,1)=0
          and decode(p.agreement_id,sv.response_body(i).agreement_id,0,1)=0
          and decode(p.agreement_name,sv.response_body(i).agreement_name,0,1)=0
          and decode(p.billing_frequency,sv.response_body(i).billing_frequency,0,1)=0;
        if sql%rowcount=0 then
          update oci_account_contract_service_snap set is_current='N'
            where service_id=sv.response_body(i).id and subscription_id=cfg.subscription_id and is_current='Y';
          insert into oci_account_contract_service_snap(sync_run_id,service_id,subscription_id,
            service_type,status,product_name,product_part_number,time_start,time_end,
            quantity_text,used_amount_text,available_amount_text,funded_allocation_text,
            agreement_id,agreement_name,billing_frequency,last_seen_run_id)
          values(:run_id,sv.response_body(i).id,cfg.subscription_id,
            sv.response_body(i).l_type,sv.response_body(i).status,
            case when sv.response_body(i).product is not null then sv.response_body(i).product.name end,
            case when sv.response_body(i).product is not null then sv.response_body(i).product.part_number end,
            sv.response_body(i).time_start,sv.response_body(i).time_end,
            sv.response_body(i).quantity,sv.response_body(i).used_amount,
            sv.response_body(i).available_amount,sv.response_body(i).funded_allocation_value,
            sv.response_body(i).agreement_id,sv.response_body(i).agreement_name,
            sv.response_body(i).billing_frequency,:run_id);
        end if;
        service_count:=service_count+1;
        commitment_page:=null;
        seen_commitment.delete;
        loop
          retry_count:=0;
          loop
            retry_count:=retry_count+1;
            begin
              cm:=dbms_cloud_oci_os_commitment.list_commitments(
                subscribed_service_id=>sv.response_body(i).id,
                compartment_id=>cfg.tenancy_ocid,
                limit=>:page_size,page=>commitment_page,
                region=>cfg.endpoint_region,
                credential_name=>cfg.credential_name);
              if cm.status_code=404 then
                raise_application_error(-20404,'OneSubscription commitments HTTP 404');
              end if;
              if cm.status_code<>200 or cm.response_body is null then
                raise_application_error(-20314,
                  'OneSubscription commitments HTTP '||cm.status_code);
              end if;
              exit;
            exception when others then
              if sqlcode<>-20404 or retry_count>=3 then raise; end if;
              dbms_output.put_line('commitment read 404; retry '||retry_count);
              dbms_lock.sleep(retry_count);
            end;
          end loop;
          for j in 1..cm.response_body.count loop
            if cm.response_body(j).id is null or
               cm.response_body(j).subscribed_service_id<>sv.response_body(i).id then
              raise_application_error(-20314,'Commitment identity does not match service');
            end if;
            update oci_account_contract_commitment_snap p set last_seen_run_id=:run_id
            where p.commitment_id=cm.response_body(j).id and p.service_id=sv.response_body(i).id
              and p.is_current='Y'
              and decode(p.time_start,cm.response_body(j).time_start,0,1)=0
              and decode(p.time_end,cm.response_body(j).time_end,0,1)=0
              and decode(p.quantity_text,cm.response_body(j).quantity,0,1)=0
              and decode(p.used_amount_text,cm.response_body(j).used_amount,0,1)=0
              and decode(p.available_amount_text,cm.response_body(j).available_amount,0,1)=0
              and decode(p.funded_allocation_text,cm.response_body(j).funded_allocation_value,0,1)=0;
            if sql%rowcount=0 then
              update oci_account_contract_commitment_snap set is_current='N'
                where commitment_id=cm.response_body(j).id and service_id=sv.response_body(i).id
                  and is_current='Y';
              insert into oci_account_contract_commitment_snap(sync_run_id,commitment_id,service_id,
                time_start,time_end,quantity_text,used_amount_text,available_amount_text,
                funded_allocation_text,last_seen_run_id)
              values(:run_id,cm.response_body(j).id,sv.response_body(i).id,
                cm.response_body(j).time_start,cm.response_body(j).time_end,
                cm.response_body(j).quantity,cm.response_body(j).used_amount,
                cm.response_body(j).available_amount,cm.response_body(j).funded_allocation_value,:run_id);
            end if;
            commitment_count:=commitment_count+1;
          end loop;
          next_token:=next_page(cm.headers);
          exit when next_token is null;
          if seen_commitment.exists(next_token) then
            raise_application_error(-20314,'Repeated commitment page');
          end if;
          seen_commitment(next_token):=true;
          commitment_page:=next_token;
        end loop;
      end loop;
      next_token:=next_page(sv.headers);
      exit when next_token is null;
      if seen_service.exists(next_token) then raise_application_error(-20313,'Repeated service page'); end if;
      seen_service(next_token):=true;
      service_page:=next_token;
    end loop;
    update oci_account_contract_commitment_snap p set is_current='N'
      where p.is_current='Y' and p.last_seen_run_id<>:run_id
        and exists (select 1 from oci_account_contract_service_snap s
          where s.service_id=p.service_id and s.subscription_id=cfg.subscription_id);
    update oci_account_contract_service_snap set is_current='N'
      where subscription_id=cfg.subscription_id and is_current='Y' and last_seen_run_id<>:run_id;
    :services_read:=service_count;
    :commitments_read:=commitment_count;
  end;~'
  using in c.subscription_id,in p_page_size,in run_id,
        out service_count,out commitment_count;
  update oci_account_contract_run set status='COMPLETED',completed_at=systimestamp,
    services_read=service_count,commitments_read=commitment_count where sync_run_id=run_id;
  commit;
exception when others then
  err:=sqlcode;
  msg:=substr(sqlerrm,1,4000);
  if started then
    rollback;
    update oci_account_contract_run set status='FAILED',completed_at=systimestamp,
      error_code=err,error_message=msg where sync_run_id=run_id;
    commit;
  elsif locked then rollback;
  end if;
  raise;
end;
/
show errors procedure oci_sync_contract
declare n number;
begin
  select count(*) into n from user_errors where name='OCI_SYNC_CONTRACT' and type='PROCEDURE';
  if n>0 then raise_application_error(-20315,'Contract procedure compilation failed'); end if;
end;
/
