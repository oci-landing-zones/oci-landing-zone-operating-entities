local exadb_events = import './events.libsonnet';

{
  render(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local scope = inputs.scope;
    local scope_config =
      if std.objectHas(inputs, 'scope_config') then inputs.scope_config
      else {};
    local model = inputs.model;
    local notification = inputs.notification;
    local components =
      if std.objectHas(inputs, 'components') then inputs.components
      else { infrastructure: true, database: true };
    local product_upper = std.asciiUpper(product.code);
    local topic_emails(key) = notification.topic_emails(key);
    local subscriptions(email_key) = [{ protocol: 'EMAIL', values: topic_emails(email_key) }];

    local shared_infra_topic_key = n.key_global('NOTT', [product_upper, 'SHARED', 'INFRA', 'WORKLOADS']);
    local db_topic_key = n.key_global('NOTT', [product_upper, 'DB', 'WORKLOADS']);
    local env_topic_key(env_name) = n.key_global('NOTT', [env_name, product_upper, 'PROJECTS']);
    local has_environment_platform_topic =
      scope.scope_type == 'environment' &&
      std.objectHas(scope_config, 'extension_entry_uses_publication_components') &&
      scope_config.extension_entry_uses_publication_components &&
      (components.infrastructure || components.database);
    local project_environment_names = [
      env_name
      for env_name in std.objectFields(model.by_environment)
      if std.length(model.by_environment[env_name]) > 0
    ];
    local topic_environment_names =
      if has_environment_platform_topic &&
         !std.member(project_environment_names, scope.scope_name) then
        project_environment_names + [scope.scope_name]
      else project_environment_names;
    local project_topics = {
      [env_topic_key(env_name)]: {
        name: n.display_global('nott', [env_name, product.code, 'projects']),
        description: descriptions.project_topic(model.environment_scope(env_name)),
        compartment_id: n.key_global('CMP', [env_name, 'SECURITY']),
        subscriptions: subscriptions('projects'),
      }
      for env_name in topic_environment_names
    };

    local topics =
      (if scope.scope_type == 'shared' then
        (if components.database then {
        [db_topic_key]: {
          name: n.display_global('nott', [product.code, 'db', 'workloads']),
          description: descriptions.shared_db_topic,
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('db_workloads'),
        },
        } else {}) +
        (if components.infrastructure then {
        [shared_infra_topic_key]: {
          name: n.display_global('nott', [product.code, 'infra', 'workloads']),
          description: descriptions.shared_infra_topic,
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('infra_workloads'),
        },
        } else {})
      else {}) + project_topics;

    local event_catalog = exadb_events.catalog(product);
    local shared_operator_rule_segments =
      if product.code == 'exacc' then ['NOTIFICATION', 'OPERATOR', 'ACCESS', 'CONTROL']
      else ['NOTIFICATION', product_upper, 'OPERATOR', 'ACCESS', 'CONTROL'];
    local project_rule_segments(env_name, project_name, project_count) =
      local base =
        if product.code == 'exacc' then [env_name, 'NOTIFICATION', 'PROJECTS']
        else [env_name, product_upper, 'NOTIFICATION', 'PROJECTS'];
      if project_count == 1 then base else base + [project_name];
    local project_display_segments(env_name, project_name, project_count) =
      if project_count == 1 then
        [env_name, 'notify-on-notifications']
      else
        [env_name, 'notify-on-notifications', project_name];
    local project_event_rules_for_env(env_name) =
      local project_names = model.by_environment[env_name];
      {
        [n.key_global('RUL', project_rule_segments(env_name, project_name, std.length(project_names)))]: {
          compartment_id: inputs.project_db_key(env_name, project_name),
          destination_topic_ids: [env_topic_key(env_name)],
          event_display_name:
            n.display_global('rul', project_display_segments(env_name, project_name, std.length(project_names))),
          supplied_events: event_catalog.db,
        }
        for project_name in project_names
      };
    local all_project_event_rules = std.foldl(
      function(acc, env_name) acc + project_event_rules_for_env(env_name),
      project_environment_names,
      {}
    );

    local event_rules =
      if scope.scope_type == 'shared' then
        (if components.infrastructure then {
        [n.key_global('RUL', shared_operator_rule_segments)]: {
          compartment_id: n.key_global('CMP', ['SECURITY']),
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-opctl-events']),
          supplied_events: event_catalog.operator,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', product_upper, 'INFRA'])]: {
          compartment_id: inputs.infra_key,
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-%s-infra-events' % product.code]),
          supplied_events: event_catalog.infra,
        },
        } else {}) +
        (if components.database then {
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', product_upper, 'DB'])]: {
          compartment_id: inputs.db_key,
          destination_topic_ids: [db_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-%s-db-events' % product.code]),
          supplied_events: event_catalog.db,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', product_upper, 'VMC'])]: {
          compartment_id: inputs.db_key,
          destination_topic_ids: [if components.infrastructure then shared_infra_topic_key else db_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-%s-vmc-events' % product.code]),
          supplied_events: event_catalog.vmc,
        },
        } else {}) + all_project_event_rules
      else
        if !has_environment_platform_topic then
          if std.objectHas(model.by_environment, scope.scope_name) then
            project_event_rules_for_env(scope.scope_name)
          else {}
        else
        local env_topic = env_topic_key(scope.scope_name);
        (if components.infrastructure then {
        [n.key_global('RUL', [scope.scope_name, 'NOTIFICATION', 'PLATFORM', product_upper, 'INFRA'])]: {
          compartment_id: inputs.infra_key,
          destination_topic_ids: [env_topic],
          event_display_name: n.display_global('rul', [scope.scope_name, 'notify-on-%s-infra-events' % product.code]),
          supplied_events: event_catalog.infra,
        },
        } else {}) +
        (if components.database then {
        [n.key_global('RUL', [scope.scope_name, 'NOTIFICATION', 'PLATFORM', product_upper, 'DB'])]: {
          compartment_id: inputs.db_key,
          destination_topic_ids: [env_topic],
          event_display_name: n.display_global('rul', [scope.scope_name, 'notify-on-%s-db-events' % product.code]),
          supplied_events: event_catalog.db,
        },
        [n.key_global('RUL', [scope.scope_name, 'NOTIFICATION', 'PLATFORM', product_upper, 'VMC'])]: {
          compartment_id: inputs.db_key,
          destination_topic_ids: [env_topic],
          event_display_name: n.display_global('rul', [scope.scope_name, 'notify-on-%s-vmc-events' % product.code]),
          supplied_events: event_catalog.vmc,
        },
        } else {}) +
        if std.objectHas(model.by_environment, scope.scope_name) then
          project_event_rules_for_env(scope.scope_name)
        else {};

    local alarm(scope_segments, key_segments, display_segments, topic_key, namespace, query, severity='CRITICAL') = {
      [n.key_global('AL', scope_segments + (if product.code == 'exacs' then [product_upper] else []) + key_segments)]: {
        display_name: n.display_global('al', display_segments),
        compartment_id: inputs.db_key,
        destination_topic_ids: [topic_key],
        is_enabled: 'false',
        supplied_alarm: {
          message_format: 'PRETTY_JSON',
          namespace: namespace,
          pending_duration: 'PT5M',
          query: query,
          severity: severity,
        },
      },
    };
    local alarms =
      if components.database && (scope.scope_type == 'shared' || has_environment_platform_topic) then
        local scope_segments = if scope.scope_type == 'shared' then [] else [scope.scope_name];
        local display_prefix = if scope.scope_type == 'shared' then [] else [scope.scope_name];
        local db_alarm_topic =
          if scope.scope_type == 'shared' then db_topic_key
          else env_topic_key(scope.scope_name);
        local infra_alarm_topic =
          if scope.scope_type == 'shared' then
            if components.infrastructure then shared_infra_topic_key else db_topic_key
          else env_topic_key(scope.scope_name);
        alarm(scope_segments, ['CPUUTIL'], display_prefix + ['db', 'cpuutil'], db_alarm_topic, 'oci_database', 'CpuUtilization[1m].mean() >= 90') +
        alarm(scope_segments, ['STORAGEUTIL'], display_prefix + ['db', 'storageutil'], db_alarm_topic, 'oci_database', 'StorageUtilization[1m].mean() >= 90') +
        alarm(scope_segments, ['DB', 'CLUSTER', 'CPUUTIL'], display_prefix + ['vmc', 'cpuutil'], infra_alarm_topic, 'oci_database_cluster', 'CpuUtilization[1m].mean() >= 90') +
        alarm(scope_segments, ['DB', 'CLUSTER', 'DISKUTIL'], display_prefix + ['vmc', 'dgutil'], infra_alarm_topic, 'oci_database_cluster', 'ASMDiskgroupUtilization[1m].mean() >= 90') +
        alarm(scope_segments, ['DB', 'CLUSTER', 'FSUTIL'], display_prefix + ['vmc', 'fsutil'], db_alarm_topic, 'oci_database_cluster', 'FilesystemUtilization[1m].mean() >= 90') +
        alarm(scope_segments, ['DB', 'CLUSTER', 'MEMUTIL'], display_prefix + ['vmc', 'memutil'], infra_alarm_topic, 'oci_database_cluster', 'MemoryUtilization[1m].mean() >= 80') +
        alarm(scope_segments, ['DB', 'CLUSTER', 'SWAPUTIL'], display_prefix + ['vmc', 'swaputil'], infra_alarm_topic, 'oci_database_cluster', 'SwapUtilization[1m].mean() >= 75')
      else {};

    {
      alarms: alarms,
      event_rules: event_rules,
      topics: topics,
    },
}
