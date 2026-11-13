-- Synchronize Cloud Advisor recommendations and resource actions through the
-- ADB Resource Principal. The procedure only performs GET calls to OCI.

whenever sqlerror exit failure rollback
set define off

create or replace procedure oci_sync_advisor (
  p_force_run in number default 0,
  p_page_size in number default 1000
) authid definer
as
  l_tenancy_ocid           oci_advisor_config.tenancy_ocid%type;
  l_region                 oci_advisor_config.endpoint_region%type;
  l_credential_name        oci_advisor_config.credential_name%type;
  l_enabled                oci_advisor_config.is_sync_enabled%type;
  l_sync_run_id            oci_advisor_sync_run.sync_run_id%type;
  l_response               dbms_cloud_types.resp;
  l_headers                json_object_t;
  l_payload                clob;
  l_page                   varchar2(4000);
  l_endpoint               varchar2(4000);
  l_recommendations_read   number := 0;
  l_actions_read           number := 0;
  l_error_code             number;
  l_error_message          varchar2(4000);
  l_locked                 boolean := false;
  l_savepoint_set          boolean := false;
  l_config_count           number;
  l_document               json_object_t;
  l_header_keys            json_key_list;
  type page_set is table of boolean index by varchar2(4000);
  l_seen_pages             page_set;
  l_page_count             pls_integer := 0;

  procedure begin_run is
    pragma autonomous_transaction;
  begin
    insert into oci_advisor_sync_run (status, endpoint_region)
    values ('RUNNING', l_region)
    returning sync_run_id into l_sync_run_id;
    commit;
  exception
    when others then rollback; raise;
  end begin_run;

  procedure request_page(p_resource_path varchar2, p_include_resource_metadata boolean) is
    l_uri varchar2(32767);
  begin
    l_uri := l_endpoint || p_resource_path || '?compartmentId=' || l_tenancy_ocid ||
             '&compartmentIdInSubtree=true&limit=' || to_char(p_page_size, 'FM9990');
    if p_include_resource_metadata then
      l_uri := l_uri || '&includeResourceMetadata=true';
    end if;
    if l_page is not null then
      l_uri := l_uri || '&page=' || utl_url.escape(l_page, true, 'AL32UTF8');
    end if;

    l_response := dbms_cloud.send_request(
      credential_name => l_credential_name,
      uri             => l_uri,
      method          => dbms_cloud.method_get,
      timeout         => 120
    );
    if dbms_cloud.get_response_status_code(l_response) <> 200 then
      raise_application_error(-20080, 'Cloud Advisor returned HTTP ' || dbms_cloud.get_response_status_code(l_response));
    end if;
    l_payload := dbms_cloud.get_response_text(l_response);
    -- An unexpected response must never publish an empty successful snapshot.
    l_document := json_object_t.parse(l_payload);
    if not l_document.has('items') then
      raise_application_error(-20084, 'Cloud Advisor response has no items array.');
    end if;
    if not l_document.get('items').is_array then
      raise_application_error(-20084, 'Cloud Advisor items must be an array.');
    end if;
    l_headers := dbms_cloud.get_response_headers(l_response);
    l_page := null;
    l_header_keys := l_headers.get_keys;
    for i in 1..l_header_keys.count loop
      if lower(l_header_keys(i)) = 'opc-next-page' then
        l_page := l_headers.get_string(l_header_keys(i));
      end if;
    end loop;
    l_page_count := l_page_count + 1;
    if l_page_count > 10000 then
      raise_application_error(-20085, 'Cloud Advisor page limit exceeded.');
    end if;
    if l_page is not null then
      if l_seen_pages.exists(l_page) then
        raise_application_error(-20085, 'Cloud Advisor repeated a pagination token.');
      end if;
      l_seen_pages(l_page) := true;
    end if;
  end request_page;

  procedure sync_recommendations is
  begin
    l_page := null;
    l_seen_pages.delete;
    l_page_count := 0;
    loop
      request_page('/20200606/recommendations', false);
      for r in (
        select recommendation_id, compartment_id, category_id, recommendation_name,
               description_code, importance, lifecycle_state, recommendation_status,
               estimated_cost_saving, currency_code, time_status_begin, time_status_end,
               source_created_at, source_updated_at, item_payload
          from json_table(l_payload, '$.items[*]' error on error
            columns (
              recommendation_id     varchar2(512) path '$.id' null on empty,
              compartment_id        varchar2(512) path '$.compartmentId' null on empty,
              category_id           varchar2(512) path '$.categoryId' null on empty,
              recommendation_name   varchar2(512) path '$.name' null on empty,
              description_code      varchar2(1000) path '$.description' null on empty,
              importance            varchar2(30) path '$.importance' null on empty,
              lifecycle_state       varchar2(30) path '$.lifecycleState' null on empty,
              recommendation_status varchar2(30) path '$.status' null on empty,
              estimated_cost_saving number path '$.estimatedCostSaving' null on empty,
              currency_code         varchar2(30) path '$.extendedMetadata.currencyCode' null on empty,
              time_status_begin     timestamp with time zone path '$.timeStatusBegin' null on empty,
              time_status_end       timestamp with time zone path '$.timeStatusEnd' null on empty,
              source_created_at     timestamp with time zone path '$.timeCreated' null on empty,
              source_updated_at     timestamp with time zone path '$.timeUpdated' null on empty,
              item_payload          clob format json path '$'
            )
          )
      ) loop
        merge into oci_advisor_recommendation t
        using (select r.recommendation_id as recommendation_id from dual) s
           on (t.recommendation_id = s.recommendation_id)
        when matched then update set
          t.compartment_id = r.compartment_id,
          t.category_id = r.category_id,
          t.recommendation_name = r.recommendation_name,
          t.description_code = r.description_code,
          t.importance = r.importance,
          t.lifecycle_state = r.lifecycle_state,
          t.recommendation_status = r.recommendation_status,
          t.estimated_cost_saving = r.estimated_cost_saving,
          t.currency_code = r.currency_code,
          t.time_status_begin = r.time_status_begin,
          t.time_status_end = r.time_status_end,
          t.source_created_at = r.source_created_at,
          t.source_updated_at = r.source_updated_at,
          t.last_seen_at = systimestamp,
          t.last_seen_run_id = l_sync_run_id,
          t.source_payload = r.item_payload
        when not matched then insert (
          recommendation_id, compartment_id, category_id, recommendation_name,
          description_code, importance, lifecycle_state, recommendation_status,
          estimated_cost_saving, currency_code, time_status_begin, time_status_end,
          source_created_at, source_updated_at, first_seen_at, last_seen_at,
          last_seen_run_id, source_payload
        ) values (
          r.recommendation_id, r.compartment_id, r.category_id, r.recommendation_name,
          r.description_code, r.importance, r.lifecycle_state, r.recommendation_status,
          r.estimated_cost_saving, r.currency_code, r.time_status_begin, r.time_status_end,
          r.source_created_at, r.source_updated_at, systimestamp, systimestamp,
          l_sync_run_id, r.item_payload
        );

        insert into oci_advisor_recommendation_snap (
          sync_run_id, recommendation_id, compartment_id, category_id,
          recommendation_name, importance, lifecycle_state, recommendation_status,
          estimated_cost_saving, currency_code, source_updated_at, source_payload
        ) values (
          l_sync_run_id, r.recommendation_id, r.compartment_id, r.category_id,
          r.recommendation_name, r.importance, r.lifecycle_state, r.recommendation_status,
          r.estimated_cost_saving, r.currency_code, r.source_updated_at, r.item_payload
        );
        l_recommendations_read := l_recommendations_read + 1;
      end loop;
      exit when l_page is null;
    end loop;
  end sync_recommendations;

  procedure sync_resource_actions is
  begin
    l_page := null;
    l_seen_pages.delete;
    l_page_count := 0;
    loop
      request_page('/20200606/resourceActions', true);
      for r in (
        select resource_action_id, recommendation_id, category_id, resource_ocid,
               resource_name, resource_type, compartment_id, compartment_name,
               resource_region, action_type, action_description, action_url,
               lifecycle_state, action_status, estimated_cost_saving, currency_code,
               time_status_begin, time_status_end, source_created_at, source_updated_at,
               item_payload
          from json_table(l_payload, '$.items[*]' error on error
            columns (
              resource_action_id    varchar2(512) path '$.id' null on empty,
              recommendation_id     varchar2(512) path '$.recommendationId' null on empty,
              category_id           varchar2(512) path '$.categoryId' null on empty,
              resource_ocid         varchar2(512) path '$.resourceId' null on empty,
              resource_name         varchar2(1000) path '$.name' null on empty,
              resource_type         varchar2(256) path '$.resourceType' null on empty,
              compartment_id        varchar2(512) path '$.compartmentId' null on empty,
              compartment_name      varchar2(1000) path '$.compartmentName' null on empty,
              resource_region       varchar2(64) path '$.extendedMetadata.region' null on empty,
              action_type           varchar2(100) path '$.action.type' null on empty,
              action_description    varchar2(4000) path '$.action.description' null on empty,
              action_url            varchar2(4000) path '$.action.url' null on empty,
              lifecycle_state       varchar2(30) path '$.lifecycleState' null on empty,
              action_status         varchar2(30) path '$.status' null on empty,
              estimated_cost_saving number path '$.estimatedCostSaving' null on empty,
              currency_code         varchar2(30) path '$.extendedMetadata.currencyCode' null on empty,
              time_status_begin     timestamp with time zone path '$.timeStatusBegin' null on empty,
              time_status_end       timestamp with time zone path '$.timeStatusEnd' null on empty,
              source_created_at     timestamp with time zone path '$.timeCreated' null on empty,
              source_updated_at     timestamp with time zone path '$.timeUpdated' null on empty,
              item_payload          clob format json path '$'
            )
          )
      ) loop
        merge into oci_advisor_resource_action t
        using (select r.resource_action_id as resource_action_id from dual) s
           on (t.resource_action_id = s.resource_action_id)
        when matched then update set
          t.recommendation_id = r.recommendation_id,
          t.category_id = r.category_id,
          t.resource_ocid = r.resource_ocid,
          t.resource_name = r.resource_name,
          t.resource_type = r.resource_type,
          t.compartment_id = r.compartment_id,
          t.compartment_name = r.compartment_name,
          t.resource_region = r.resource_region,
          t.action_type = r.action_type,
          t.action_description = r.action_description,
          t.action_url = r.action_url,
          t.lifecycle_state = r.lifecycle_state,
          t.action_status = r.action_status,
          t.estimated_cost_saving = r.estimated_cost_saving,
          t.currency_code = r.currency_code,
          t.time_status_begin = r.time_status_begin,
          t.time_status_end = r.time_status_end,
          t.source_created_at = r.source_created_at,
          t.source_updated_at = r.source_updated_at,
          t.last_seen_at = systimestamp,
          t.last_seen_run_id = l_sync_run_id,
          t.source_payload = r.item_payload
        when not matched then insert (
          resource_action_id, recommendation_id, category_id, resource_ocid,
          resource_name, resource_type, compartment_id, compartment_name,
          resource_region, action_type, action_description, action_url,
          lifecycle_state, action_status, estimated_cost_saving, currency_code,
          time_status_begin, time_status_end, source_created_at, source_updated_at,
          first_seen_at, last_seen_at, last_seen_run_id, source_payload
        ) values (
          r.resource_action_id, r.recommendation_id, r.category_id, r.resource_ocid,
          r.resource_name, r.resource_type, r.compartment_id, r.compartment_name,
          r.resource_region, r.action_type, r.action_description, r.action_url,
          r.lifecycle_state, r.action_status, r.estimated_cost_saving, r.currency_code,
          r.time_status_begin, r.time_status_end, r.source_created_at, r.source_updated_at,
          systimestamp, systimestamp, l_sync_run_id, r.item_payload
        );

        insert into oci_advisor_resource_action_snap (
          sync_run_id, resource_action_id, recommendation_id, resource_ocid,
          resource_type, resource_region, lifecycle_state, action_status,
          estimated_cost_saving, currency_code, source_updated_at, source_payload
        ) values (
          l_sync_run_id, r.resource_action_id, r.recommendation_id, r.resource_ocid,
          r.resource_type, r.resource_region, r.lifecycle_state, r.action_status,
          r.estimated_cost_saving, r.currency_code, r.source_updated_at, r.item_payload
        );
        l_actions_read := l_actions_read + 1;
      end loop;
      exit when l_page is null;
    end loop;
  end sync_resource_actions;
begin
  if p_force_run is null or p_force_run not in (0, 1) then
    raise_application_error(-20081, 'p_force_run must be 0 or 1.');
  end if;
  if p_page_size is null or p_page_size <> trunc(p_page_size)
     or p_page_size < 1 or p_page_size > 1000 then
    raise_application_error(-20081, 'p_page_size must be an integer from 1 to 1000.');
  end if;
  -- This integration intentionally supports exactly one tenancy/home-region.
  select count(*) into l_config_count from oci_advisor_config;
  if l_config_count <> 1 then
    raise_application_error(-20082, 'Exactly one Cloud Advisor configuration is required.');
  end if;
  select tenancy_ocid, endpoint_region, credential_name, is_sync_enabled
    into l_tenancy_ocid, l_region, l_credential_name, l_enabled
    from oci_advisor_config
   for update nowait;
  l_locked := true;

  -- Obtaining the configuration lock proves no compliant sync is still active.
  update oci_advisor_sync_run
     set status = 'FAILED', completed_at = systimestamp, error_code = -20086,
         error_message = 'Previous session ended before publishing a snapshot.'
   where status = 'RUNNING';
  savepoint advisor_sync_data;
  l_savepoint_set := true;

  if l_enabled = 'N' and nvl(p_force_run, 0) = 0 then
    insert into oci_advisor_sync_run (status, endpoint_region, completed_at)
    values ('SKIPPED', l_region, systimestamp);
    commit;
    return;
  end if;

  l_endpoint := 'https://optimizer.' || l_region || '.oci.'||FINOPS_CORE_ENDPOINT_DOMAIN();
  begin_run;
  sync_recommendations;
  sync_resource_actions;

  update oci_advisor_sync_run
     set status = 'COMPLETED',
         completed_at = systimestamp,
         recommendations_read = l_recommendations_read,
         resource_actions_read = l_actions_read
   where sync_run_id = l_sync_run_id;
  commit;
exception
  when others then
    l_error_code := sqlcode;
    l_error_message := substr(sqlerrm, 1, 4000);
    -- Do not commit or roll back the caller's work on validation/lock refusal.
    -- Run synchronization in a dedicated session: successful runs commit.
    if l_savepoint_set then
      rollback to advisor_sync_data;
    end if;
    if l_sync_run_id is not null and l_savepoint_set then
      update oci_advisor_sync_run
         set status = 'FAILED',
             completed_at = systimestamp,
             recommendations_read = l_recommendations_read,
             resource_actions_read = l_actions_read,
             error_code = l_error_code,
             error_message = l_error_message
       where sync_run_id = l_sync_run_id;
      commit;
    elsif l_locked then
      rollback;
    end if;
    raise;
end;
/

show errors procedure oci_sync_advisor

declare
  n number;
begin
  select count(*) into n from user_errors
   where name = 'OCI_SYNC_ADVISOR' and type = 'PROCEDURE';
  if n > 0 then raise_application_error(-20087, 'Cloud Advisor compilation failed.'); end if;
end;
/
