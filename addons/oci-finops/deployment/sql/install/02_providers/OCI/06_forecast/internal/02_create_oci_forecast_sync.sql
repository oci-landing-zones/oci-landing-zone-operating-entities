-- RequestSummarizedUsages uses POST for a read-only query; no OCI object writes.
-- Execute in a dedicated session: audit and publication transactions commit.
whenever sqlerror exit failure rollback
set define off
create or replace procedure oci_sync_forecast(p_force_run number default 0)
authid definer as
  c oci_forecast_config%rowtype;
  run_id number;
  today date;
  history_start date;
  cutoff date;
  horizon_end date;
  forecast_end date;
  endpoint varchar2(1000);
  actual_count number:=0;
  forecast_count number:=0;
  locked boolean:=false;
  saved boolean:=false;
  n number;
  err number;
  msg varchar2(4000);
  chunk_start date;
  chunk_end date;
  chunk number;
  lvl varchar2(16);
  function iso(d date) return varchar2 is
  begin return to_char(d,'YYYY-MM-DD"T"HH24:MI:SS"Z"'); end;
  procedure begin_run is
    pragma autonomous_transaction;
  begin
    insert into oci_forecast_run(status,tenancy_ocid,endpoint_region,as_of_day,
      history_start,actual_end,horizon_end,forecast_end)
    values('RUNNING',c.tenancy_ocid,c.endpoint_region,today,history_start,cutoff,horizon_end,forecast_end)
    returning sync_run_id into run_id;
    commit;
  exception when others then rollback; raise;
  end;
  procedure request_json(p_body varchar2,p_page varchar2,p_payload out clob,p_headers out json_object_t) is
    response dbms_cloud_types.resp;
    uri varchar2(32767):=endpoint;
  begin
    if p_page is not null then uri:=uri||'?page='||utl_url.escape(p_page,true,'AL32UTF8'); end if;
    -- TRANSPORT BEGIN
    response:=dbms_cloud.send_request(credential_name=>c.credential_name,uri=>uri,
      method=>dbms_cloud.method_post,headers=>json_object('Content-Type' value 'application/json'),
      body=>utl_raw.cast_to_raw(p_body),timeout=>120);
    if dbms_cloud.get_response_status_code(response)<>200 then
      raise_application_error(-20301,'OCI Usage API returned HTTP '||dbms_cloud.get_response_status_code(response));
    end if;
    p_payload:=dbms_cloud.get_response_text(response);
    p_headers:=dbms_cloud.get_response_headers(response);
    -- TRANSPORT END
  end;
  procedure collect(p_level varchar2,p_kind varchar2,p_chunk number,p_start date,p_end date) is
    body json_object_t:=json_object_t();
    fc json_object_t:=json_object_t();
    groups json_array_t:=json_array_t();
    text_body varchar2(32767);
    payload clob;
    headers json_object_t;
    doc json_object_t;
    keys json_key_list;
    page varchar2(4000);
    pages number:=0;
    stored number:=0;
    day_start date;
    day_end date;
    type token_set is table of boolean index by varchar2(4000);
    tokens token_set;
  begin
    body.put('tenantId',c.tenancy_ocid);
    body.put('timeUsageStarted',iso(p_start)); body.put('timeUsageEnded',iso(p_end));
    body.put('granularity','DAILY'); body.put('queryType','COST'); body.put('isAggregateByTime',false);
    groups.append('tenantId');
    if p_level='SERVICE' then groups.append('service'); end if;
    body.put('groupBy',groups);
    if p_kind='FORECAST' then
      fc.put('forecastType','BASIC'); fc.put('timeForecastStarted',iso(cutoff));
      fc.put('timeForecastEnded',iso(forecast_end)); body.put('forecast',fc);
    end if;
    text_body:=body.to_string();
    insert into oci_forecast_request(sync_run_id,query_level,request_kind,chunk_no,request_payload)
    values(run_id,p_level,p_kind,p_chunk,text_body);
    loop
      request_json(text_body,page,payload,headers);
      doc:=json_object_t.parse(payload);
      if not doc.has('items') then raise_application_error(-20302,'Missing Usage API items'); end if;
      if not doc.get('items').is_array then raise_application_error(-20302,'Usage API items is not an array'); end if;
      for r in (
        select * from json_table(payload,'$.items[*]' error on error columns (
          tenant_id varchar2(512) path '$.tenantId',
          service_name varchar2(512) path '$.service' null on empty,
          currency_code varchar2(32) path '$.currency' null on empty,
          period_start timestamp with time zone path '$.timeUsageStarted',
          period_end timestamp with time zone path '$.timeUsageEnded',
          amount number path '$.computedAmount' null on empty,
          is_forecast varchar2(8) path '$.isForecast',
          item clob format json path '$'
        ))
      ) loop
        day_start:=cast(sys_extract_utc(r.period_start) as date);
        day_end:=cast(sys_extract_utc(r.period_end) as date);
        if r.tenant_id is null or r.is_forecast is null or r.is_forecast not in ('true','false')
           or day_start is null or day_end is null or day_start<>trunc(day_start) or day_end<>day_start+1
           or (p_level='SERVICE' and r.service_name is null)
           or (p_level='TENANCY' and r.service_name is not null) then
          raise_application_error(-20303,'Invalid Usage API grain, date or forecast flag');
        end if;
        if r.is_forecast='false' then
          if day_start<p_start or day_end>p_end then raise_application_error(-20303,'Actual point outside requested interval'); end if;
        else
          if p_kind<>'FORECAST' or day_start<cutoff or day_end>forecast_end then
            raise_application_error(-20303,'Forecast point outside requested interval');
          end if;
        end if;
        -- Forecast responses also include historical points. The independently
        -- collected actual windows own those days, so do not duplicate them.
        if p_kind='ACTUAL' or r.is_forecast='true' then
          insert into oci_forecast_point(sync_run_id,query_level,point_kind,tenant_id,
            service_name,currency_code,period_start,period_end,amount,source_payload)
          values(run_id,p_level,p_kind,r.tenant_id,r.service_name,r.currency_code,day_start,day_end,r.amount,r.item);
          stored:=stored+1;
          if p_kind='ACTUAL' then actual_count:=actual_count+1; else forecast_count:=forecast_count+1; end if;
        end if;
      end loop;
      page:=null; keys:=headers.get_keys;
      for i in 1..keys.count loop
        if lower(keys(i))='opc-next-page' then page:=headers.get_string(keys(i)); end if;
      end loop;
      pages:=pages+1;
      if pages>10000 then raise_application_error(-20304,'Usage API page limit exceeded'); end if;
      if page is not null then
        if tokens.exists(page) then raise_application_error(-20304,'Repeated Usage API page token'); end if;
        tokens(page):=true;
      end if;
      exit when page is null;
    end loop;
    update oci_forecast_request set pages_read=pages,points_stored=stored
    where sync_run_id=run_id and query_level=p_level and request_kind=p_kind and chunk_no=p_chunk;
  end;
begin
  if p_force_run is null or p_force_run not in (0,1) then raise_application_error(-20305,'force must be 0 or 1'); end if;
  select count(*) into n from oci_forecast_config;
  if n<>1 then raise_application_error(-20305,'Exactly one forecast configuration required'); end if;
  select * into c from oci_forecast_config for update nowait;
  locked:=true;
  if not regexp_like(c.endpoint_region,'^[a-z0-9]+(-[a-z0-9]+)+$') or
     not regexp_like(c.endpoint_domain,'^[a-z0-9]+([.][a-z0-9-]+)+$') then
    raise_application_error(-20305,'Invalid endpoint region/domain');
  end if;
  select count(*) into n from oci_forecast_run where status='COMPLETED'
    and (tenancy_ocid<>c.tenancy_ocid or endpoint_region<>c.endpoint_region);
  if n>0 then raise_application_error(-20305,'Existing history belongs to another source'); end if;
  select trunc(sys_extract_utc(systimestamp)) into today from dual;
  cutoff:=today-1; history_start:=cutoff-c.history_days;
  horizon_end:=today+c.horizon_days;
  forecast_end:=greatest(horizon_end,add_months(trunc(today,'MM'),1));
  if forecast_end-cutoff>c.history_days then raise_application_error(-20305,'History must cover requested forecast span including lag and month end'); end if;
  update oci_forecast_run set status='FAILED',completed_at=systimestamp,error_code=-20306,
    error_message='Previous session ended before publishing a vintage' where status='RUNNING';
  savepoint forecast_data; saved:=true;
  if c.is_sync_enabled='N' and p_force_run=0 then
    insert into oci_forecast_run(status,tenancy_ocid,endpoint_region,as_of_day,history_start,
      actual_end,horizon_end,forecast_end,completed_at)
    values('SKIPPED',c.tenancy_ocid,c.endpoint_region,today,history_start,cutoff,horizon_end,forecast_end,systimestamp);
    commit; return;
  end if;
  endpoint:='https://usageapi.'||c.endpoint_region||'.oci.'||c.endpoint_domain||'/20200107/usage';
  begin_run;
  for i in 1..2 loop
    lvl:=case when i=1 then 'TENANCY' else 'SERVICE' end;
    chunk_start:=history_start; chunk:=0;
    while chunk_start<cutoff loop
      -- Bound historical scans by calendar month; requests remain non-overlapping.
      chunk_end:=least(cutoff,add_months(trunc(chunk_start,'MM'),1));
      chunk:=chunk+1; collect(lvl,'ACTUAL',chunk,chunk_start,chunk_end);
      chunk_start:=chunk_end;
    end loop;
    -- OCI manages its ETS model. Request an equivalent historical interval
    -- with forecast, then retain only returned isForecast=true points.
    collect(lvl,'FORECAST',1,cutoff-greatest(10,forecast_end-cutoff),cutoff);
  end loop;
  update oci_forecast_run set status='COMPLETED',completed_at=systimestamp,
    actual_rows=actual_count,forecast_rows=forecast_count where sync_run_id=run_id;
  commit;
exception when others then
  err:=sqlcode; msg:=substr(sqlerrm,1,4000);
  if saved then rollback to forecast_data; end if;
  if run_id is not null and saved then
    update oci_forecast_run set status='FAILED',completed_at=systimestamp,
      error_code=err,error_message=msg where sync_run_id=run_id;
    commit;
  elsif locked then rollback;
  end if;
  raise;
end;
/
show errors procedure oci_sync_forecast
declare n number;
begin
  select count(*) into n from user_errors where name='OCI_SYNC_FORECAST' and type='PROCEDURE';
  if n>0 then raise_application_error(-20307,'Forecast compilation failed'); end if;
end;
/
