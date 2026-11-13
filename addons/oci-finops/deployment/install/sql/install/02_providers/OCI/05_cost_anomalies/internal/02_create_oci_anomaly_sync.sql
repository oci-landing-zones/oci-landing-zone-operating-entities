-- Use a dedicated session: this procedure commits its own sync transaction.
whenever sqlerror exit failure rollback
set define off

create or replace procedure oci_sync_anomalies (
  p_force_run in number default 0,
  p_page_size in number default 100
) authid definer as
  l_config oci_anomaly_config%rowtype;
  l_run number;
  l_start timestamp with time zone;
  l_end timestamp with time zone;
  l_endpoint varchar2(1000);
  l_monitors number := 0;
  l_events number := 0;
  l_count number;
  l_locked boolean := false;
  l_saved boolean := false;
  l_code number;
  l_error varchar2(4000);

  procedure begin_run is
    pragma autonomous_transaction;
  begin
    insert into oci_anomaly_sync_run(status,tenancy_ocid,endpoint_region,window_start,window_end)
    values ('RUNNING',l_config.tenancy_ocid,l_config.endpoint_region,l_start,l_end)
    returning sync_run_id into l_run;
    commit;
  exception when others then rollback; raise;
  end;

  procedure request_json(p_path varchar2,p_payload out clob,p_headers out json_object_t) is
    l_response dbms_cloud_types.resp;
  begin
    -- TRANSPORT BEGIN (isolated regression tests replace only this block).
    l_response := dbms_cloud.send_request(credential_name=>l_config.credential_name,
      uri=>l_endpoint||p_path,method=>dbms_cloud.method_get,timeout=>120);
    if dbms_cloud.get_response_status_code(l_response) <> 200 then
      raise_application_error(-20101,'OCI Cost Anomaly returned HTTP '||dbms_cloud.get_response_status_code(l_response));
    end if;
    p_payload := dbms_cloud.get_response_text(l_response);
    p_headers := dbms_cloud.get_response_headers(l_response);
    -- TRANSPORT END
  end;

  procedure collect(p_kind varchar2) is
    l_path varchar2(32767);
    l_base varchar2(32767);
    l_page varchar2(4000);
    l_pages number := 0;
    type token_set is table of boolean index by varchar2(4000);
    l_tokens token_set;
    l_payload clob;
    l_detail clob;
    l_root clob;
    l_headers json_object_t;
    l_detail_headers json_object_t;
    l_doc json_object_t;
    l_obj json_object_t;
    l_root_obj json_object_t;
    l_items json_array_t;
    l_keys json_key_list;
    l_id varchar2(512);
  begin
    l_base := '/'||p_kind||'?compartmentId='||utl_url.escape(l_config.tenancy_ocid,true,'AL32UTF8')
           ||'&limit='||to_char(p_page_size,'FM990');
    if p_kind='costAnomalyEvents' then
      l_base := l_base||'&timeAnomalyEventStartDate='||
        utl_url.escape(to_char(sys_extract_utc(l_start),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),true,'AL32UTF8')||
        '&timeAnomalyEventEndDate='||
        utl_url.escape(to_char(sys_extract_utc(l_end),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),true,'AL32UTF8');
    end if;
    loop
      l_path := l_base;
      if l_page is not null then l_path:=l_path||'&page='||utl_url.escape(l_page,true,'AL32UTF8'); end if;
      request_json(l_path,l_payload,l_headers);
      l_doc := json_object_t.parse(l_payload);
      if not l_doc.has('items') then raise_application_error(-20102,'Missing items array'); end if;
      if not l_doc.get('items').is_array then raise_application_error(-20102,'Invalid items array'); end if;
      l_items := l_doc.get_array('items');
      if l_items.get_size>0 then
        for i in 0..l_items.get_size-1 loop
          l_obj := treat(l_items.get(i) as json_object_t);
          l_obj.on_error(1);
          l_id := l_obj.get_string('id');
          if l_id is null then raise_application_error(-20103,'Missing entity ID'); end if;
          request_json('/'||p_kind||'/'||utl_url.escape(l_id,true,'AL32UTF8'),l_detail,l_detail_headers);
          l_obj := json_object_t.parse(l_detail);
          l_obj.on_error(1);
          if l_obj.get_string('id') is null or l_obj.get_string('id')<>l_id then
            raise_application_error(-20103,'List/detail entity ID mismatch');
          end if;
          if l_obj.get_string('compartmentId') is null or l_obj.get_string('compartmentId')<>l_config.tenancy_ocid then
            raise_application_error(-20103,'Unexpected source tenancy');
          end if;
          if p_kind='costAnomalyMonitors' then
            insert into oci_anomaly_monitor_snap
              (sync_run_id,monitor_id,compartment_id,monitor_name,monitor_type,lifecycle_state,
               lifecycle_details,source_created_at,source_updated_at,source_payload)
            select l_run,id,compartment_id,name,kind,state,details,created_at,updated_at,l_detail
            from json_table(l_detail,'$' error on error columns (
              id varchar2(512) path '$.id', compartment_id varchar2(512) path '$.compartmentId',
              name varchar2(1000) path '$.name' null on empty,
              kind varchar2(64) path '$.type' null on empty,
              state varchar2(64) path '$.lifecycleState' null on empty,
              details varchar2(4000) path '$.lifecycleDetails' null on empty,
              created_at timestamp with time zone path '$.timeCreated' null on empty,
              updated_at timestamp with time zone path '$.timeUpdated' null on empty));
            l_monitors := l_monitors+1;
          else
            l_root := null;
            -- OCI returns rootCauseDetail.value as an object in list results,
            -- but may serialize it as a JSON string in GET detail results.
            if l_obj.has('rootCauseDetail') then
              if not l_obj.get('rootCauseDetail').is_null then
                l_root_obj:=l_obj.get_object('rootCauseDetail');
                if l_root_obj.has('value') then
                  if l_root_obj.get('value').is_object then
                    l_root:=l_root_obj.get_object('value').to_clob();
                  elsif l_root_obj.get('value').is_string then
                    l_root:=l_root_obj.get_clob('value');
                    l_root_obj:=json_object_t.parse(l_root);
                  elsif not l_root_obj.get('value').is_null then
                    raise_application_error(-20104,'Unexpected root cause value type');
                  end if;
                end if;
              end if;
            end if;
            insert into oci_anomaly_event_snap
              (sync_run_id,event_id,compartment_id,event_name,monitor_id,monitor_name,monitor_type,
               lifecycle_state,event_date,cost_impact,cost_variance_percentage,actual_total_cost,
               expected_total_cost,root_total_cost_impact,feedback_response,source_created_at,
               source_updated_at,source_payload,root_cause_payload)
            select l_run,id,compartment_id,name,monitor_id,monitor_name,kind,state,event_date,
              impact,variance,
              json_value(l_root,'$.actualTotalCost' returning number error on error null on empty),
              json_value(l_root,'$.expectedTotalCost' returning number error on error null on empty),
              json_value(l_root,'$.totalCostImpact' returning number error on error null on empty),
              feedback,created_at,updated_at,l_detail,l_root
            from json_table(l_detail,'$' error on error columns (
              id varchar2(512) path '$.id', compartment_id varchar2(512) path '$.compartmentId',
              name varchar2(1000) path '$.costAnomalyName' null on empty,
              monitor_id varchar2(512) path '$.costMonitorId',
              monitor_name varchar2(1000) path '$.costMonitorName' null on empty,
              kind varchar2(64) path '$.costMonitorType' null on empty,
              state varchar2(64) path '$.lifecycleState' null on empty,
              event_date timestamp with time zone path '$.timeAnomalyEventDate',
              impact number path '$.costImpact' null on empty,
              variance number path '$.costVariancePercentage' null on empty,
              feedback varchar2(256) path '$.feedbackResponse' null on empty,
              created_at timestamp with time zone path '$.timeCreated' null on empty,
              updated_at timestamp with time zone path '$.timeUpdated' null on empty));
            l_events:=l_events+1;
          end if;
        end loop;
      end if;
      l_page := null;
      l_keys := l_headers.get_keys;
      for i in 1..l_keys.count loop
        if lower(l_keys(i))='opc-next-page' then l_page:=l_headers.get_string(l_keys(i)); end if;
      end loop;
      l_pages:=l_pages+1;
      if l_pages>10000 then raise_application_error(-20105,'Page limit exceeded'); end if;
      if l_page is not null then
        if l_tokens.exists(l_page) then raise_application_error(-20105,'Repeated pagination token'); end if;
        l_tokens(l_page):=true;
      end if;
      exit when l_page is null;
    end loop;
  end;
begin
  if p_force_run is null or p_force_run not in (0,1) or p_page_size is null
     or p_page_size<>trunc(p_page_size) or p_page_size not between 1 and 100 then
    raise_application_error(-20106,'force must be 0/1; page size must be an integer from 1 to 100');
  end if;
  select count(*) into l_count from oci_anomaly_config;
  if l_count<>1 then raise_application_error(-20106,'Exactly one anomaly configuration is required'); end if;
  select * into l_config from oci_anomaly_config for update nowait;
  l_locked:=true;
  if not regexp_like(l_config.endpoint_region,'^[a-z0-9]+(-[a-z0-9]+)+$')
     or not regexp_like(l_config.endpoint_domain,'^[a-z0-9]+([.][a-z0-9-]+)+$') then
    raise_application_error(-20106,'Invalid endpoint region/domain');
  end if;
  -- Prevent mixing tenancies/regions into an existing history.
  select count(*) into l_count from oci_anomaly_sync_run where status='COMPLETED'
    and (tenancy_ocid<>l_config.tenancy_ocid or endpoint_region<>l_config.endpoint_region);
  if l_count>0 then raise_application_error(-20106,'Existing history belongs to another tenancy/region'); end if;
  select from_tz(cast(trunc(sys_extract_utc(systimestamp))+1 as timestamp),'UTC') into l_end from dual;
  l_start:=l_end-numtodsinterval(l_config.lookback_days,'DAY');
  l_endpoint:='https://costad.'||l_config.endpoint_region||'.oci.'||l_config.endpoint_domain||'/20190111';
  update oci_anomaly_sync_run set status='FAILED',completed_at=systimestamp,error_code=-20107,
    error_message='Previous session ended before publishing a snapshot' where status='RUNNING';
  savepoint anomaly_sync_data;
  l_saved:=true;
  if l_config.is_sync_enabled='N' and p_force_run=0 then
    insert into oci_anomaly_sync_run(status,tenancy_ocid,endpoint_region,window_start,window_end,completed_at)
    values ('SKIPPED',l_config.tenancy_ocid,l_config.endpoint_region,l_start,l_end,systimestamp);
    commit;
    return;
  end if;
  begin_run;
  collect('costAnomalyMonitors');
  collect('costAnomalyEvents');
  update oci_anomaly_sync_run set status='COMPLETED',completed_at=systimestamp,
    monitors_read=l_monitors,events_read=l_events where sync_run_id=l_run;
  commit;
exception when others then
  l_code:=sqlcode; l_error:=substr(sqlerrm,1,4000);
  if l_saved then rollback to anomaly_sync_data; end if;
  if l_run is not null and l_saved then
    update oci_anomaly_sync_run set status='FAILED',completed_at=systimestamp,
      monitors_read=l_monitors,events_read=l_events,error_code=l_code,error_message=l_error
      where sync_run_id=l_run;
    commit;
  elsif l_locked then rollback;
  end if;
  raise;
end;
/
show errors procedure oci_sync_anomalies

declare n number;
begin
  select count(*) into n from user_errors where name='OCI_SYNC_ANOMALIES' and type='PROCEDURE';
  if n>0 then raise_application_error(-20108,'Cost Anomaly procedure compilation failed'); end if;
end;
/
