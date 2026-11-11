-- Discover every OneSubscription subscription in this tenancy, then capture
-- each subscription, subscribed service and commitment. No job is enabled here.
whenever sqlerror exit failure rollback
set define off
create or replace procedure oci_sync_all_contracts
authid current_user as
  l_tenancy oci_account_source.tenancy_ocid%type;
  l_region oci_account_source.home_region%type;
  l_enabled oci_account_source.contract_enabled%type;
  l_ids clob;
  l_count number := 0;
  l_failed number := 0;
begin
  select tenancy_ocid, home_region, contract_enabled
    into l_tenancy, l_region, l_enabled
    from oci_account_source where config_id=1;
  if l_enabled='N' then
    dbms_output.put_line('Commercial-contract sync is disabled');
    return;
  end if;

  -- OCI SDK response types are available to anonymous PL/SQL but not to
  -- compiled stored PL/SQL in this ADB; use the established dynamic pattern.
  execute immediate q'~declare
    r dbms_cloud_oci_os_organization_subscription_list_organization_subscriptions_response_t;
    ids json_array_t := json_array_t();
    page_token varchar2(4000);
    next_token varchar2(4000);
    retry_count number;
    keys json_key_list;
    type token_set is table of boolean index by varchar2(4000);
    seen token_set;
  begin
    loop
      retry_count:=0;
      loop
        retry_count:=retry_count+1;
        begin
          r := dbms_cloud_oci_os_organization_subscription.list_organization_subscriptions(
            compartment_id=>:tenancy, limit=>500, page=>page_token,
            region=>:region, credential_name=>'OCI$RESOURCE_PRINCIPAL');
          if r.status_code=404 then
            raise_application_error(-20404,
              'Organization subscription discovery HTTP 404');
          end if;
          if r.status_code<>200 or r.response_body is null then
            raise_application_error(-20319,
              'Organization subscription discovery HTTP '||r.status_code);
          end if;
          exit;
        exception when others then
          if sqlcode<>-20404 or retry_count>=3 then raise; end if;
          dbms_output.put_line('organization subscription read 404; retry '||
            retry_count);
          dbms_lock.sleep(retry_count);
        end;
      end loop;
      for i in 1..r.response_body.count loop
        if r.response_body(i).id is null or
           length(r.response_body(i).id)>256 then
          raise_application_error(-20319,
            'Organization subscription ID is absent or too long');
        end if;
        ids.append(r.response_body(i).id);
      end loop;
      next_token:=null;
      if r.headers is not null then
        keys:=r.headers.get_keys;
        for i in 1..keys.count loop
          if lower(keys(i))='opc-next-page' then
            next_token:=r.headers.get_string(keys(i));
            exit;
          end if;
        end loop;
      end if;
      exit when next_token is null;
      if seen.exists(next_token) then
        raise_application_error(-20319,
          'Repeated organization subscription page');
      end if;
      seen(next_token):=true;
      page_token:=next_token;
    end loop;
    :discovered_ids:=ids.to_clob;
  end;~'
    using in l_tenancy, in l_region, out l_ids;

  select count(distinct subscription_id) into l_count
    from json_table(l_ids, '$[*]'
      columns (subscription_id varchar2(256) path '$'))
   where subscription_id is not null;
  if l_count=0 then
    raise_application_error(-20319,
      'No organization subscriptions were returned by OCI');
  end if;
  l_count:=0;

  select count(*) into l_failed from oci_account_contract_config
   where tenancy_ocid<>l_tenancy or endpoint_region<>l_region;
  if l_failed<>0 then
    raise_application_error(-20319,
      'Existing commercial subscription configuration belongs to another source');
  end if;
  l_failed:=0;
  update oci_account_contract_config set is_discovered='N';

  for s in (
    select distinct subscription_id
      from json_table(l_ids, '$[*]'
        columns (subscription_id varchar2(256) path '$'))
     where subscription_id is not null
     order by subscription_id
  ) loop
    merge into oci_account_contract_config c
    using (select s.subscription_id subscription_id from dual) x
       on (c.subscription_id=x.subscription_id)
     when matched then update set
       c.is_discovered='Y', c.last_discovered_at=systimestamp
     when not matched then insert
       (subscription_id, tenancy_ocid, endpoint_region, is_sync_enabled,
        is_discovered, last_discovered_at)
       values (x.subscription_id, l_tenancy, l_region, 'Y','Y',systimestamp);
    l_count:=l_count+1;
  end loop;
  commit; -- Publish the complete discovered-ID set together.

  for s in (
    select distinct subscription_id
      from json_table(l_ids, '$[*]'
        columns (subscription_id varchar2(256) path '$'))
     where subscription_id is not null
     order by subscription_id
  ) loop
    begin
      oci_sync_contract(s.subscription_id, p_force_run=>0);
    exception when others then
      l_failed:=l_failed+1;
      dbms_output.put_line('contract_sync_failed id='||s.subscription_id||
        ' error='||substr(sqlerrm,1,1000));
    end;
  end loop;
  dbms_output.put_line('discovered_subscriptions='||l_count||
    ' failed_snapshots='||l_failed);
  if l_failed>0 then
    raise_application_error(-20319,
      l_failed||' contractual snapshot(s) failed; inspect OCI_ACCOUNT_CONTRACT_RUN');
  end if;
end;
/
show errors procedure oci_sync_all_contracts
declare n number;
begin
  select count(*) into n from user_errors
   where name='OCI_SYNC_ALL_CONTRACTS' and type='PROCEDURE';
  if n>0 then
    raise_application_error(-20319,
      'Contract discovery procedure compilation failed');
  end if;
end;
/
