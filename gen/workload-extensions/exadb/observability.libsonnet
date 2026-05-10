local exadb_events = import './events.libsonnet';

{
  render(inputs)::
    local product = inputs.product;
    local n = inputs.naming;
    local descriptions = inputs.descriptions;
    local scope = inputs.scope;
    local model = inputs.model;
    local notification = inputs.notification;
    local product_upper = std.asciiUpper(product.code);
    local topic_emails(key) = notification.topic_emails(key);
    local subscriptions(email_key) = [{ protocol: 'EMAIL', values: topic_emails(email_key) }];

    local shared_infra_topic_key = n.key_global('NOTT', [product_upper, 'SHARED', 'INFRA', 'WORKLOADS']);
    local db_topic_key = n.key_global('NOTT', [product_upper, 'DB', 'WORKLOADS']);
    local env_topic_key = n.key_global('NOTT', [scope.scope_name, product_upper, 'PROJECTS']);

    local topics =
      if scope.scope_type == 'shared' then {
        [db_topic_key]: {
          name: n.display_global('nott', [product.code, 'db', 'workloads']),
          description: descriptions.shared_db_topic,
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('db_workloads'),
        },
        [shared_infra_topic_key]: {
          name: n.display_global('nott', [product.code, 'infra', 'workloads']),
          description: descriptions.shared_infra_topic,
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('infra_workloads'),
        },
      } else {
        [env_topic_key]: {
          name: n.display_global('nott', [scope.scope_name, product.code, 'projects']),
          description: descriptions.project_topic(scope),
          compartment_id: n.key_global('CMP', [scope.scope_name, 'SECURITY']),
          subscriptions: subscriptions('projects'),
        },
      };

    local event_catalog = exadb_events.catalog(product);
    local shared_operator_rule_segments =
      if product.code == 'exacc' then ['NOTIFICATION', 'OPERATOR', 'ACCESS', 'CONTROL']
      else ['NOTIFICATION', product_upper, 'OPERATOR', 'ACCESS', 'CONTROL'];
    local project_rule_segments(project_name, project_count) =
      local base =
        if product.code == 'exacc' then [scope.scope_name, 'NOTIFICATION', 'PROJECTS']
        else [scope.scope_name, product_upper, 'NOTIFICATION', 'PROJECTS'];
      if project_count == 1 then base else base + [project_name];
    local project_display_segments(project_name, project_count) =
      if project_count == 1 then
        [scope.scope_name, 'notify-on-notifications-projects']
      else
        [scope.scope_name, 'notify-on-notifications-projects', project_name];
    local scope_project_names = model.scope_project_names;

    local event_rules =
      if scope.scope_type == 'shared' then {
        [n.key_global('RUL', shared_operator_rule_segments)]: {
          compartment_id: n.key_global('CMP', ['SECURITY']),
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-opctl-events']),
          supplied_events: event_catalog.operator,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', product_upper, 'DB'])]: {
          compartment_id: inputs.db_key,
          destination_topic_ids: [db_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-%s-db-events' % product.code]),
          supplied_events: event_catalog.db,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', product_upper, 'INFRA'])]: {
          compartment_id: inputs.infra_key,
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-%s-infra-events' % product.code]),
          supplied_events: event_catalog.infra,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', product_upper, 'VMC'])]: {
          compartment_id: inputs.db_key,
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-%s-vmc-events' % product.code]),
          supplied_events: event_catalog.vmc,
        },
      } else {
        [n.key_global('RUL', project_rule_segments(project_name, std.length(scope_project_names)))]: {
          compartment_id: inputs.project_db_key(scope.scope_name, project_name),
          destination_topic_ids: [env_topic_key],
          event_display_name:
            n.display_global('rul', project_display_segments(project_name, std.length(scope_project_names))),
          supplied_events: event_catalog.db,
        }
        for project_name in scope_project_names
      };

    local alarm(key_segments, display_segments, topic_key, namespace, query, severity='CRITICAL') = {
      [n.key_global('AL', (if product.code == 'exacs' then [product_upper] else []) + key_segments)]: {
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
      if scope.scope_type == 'shared' then
        alarm(['CPUUTIL'], ['db', 'cpuutil'], db_topic_key, 'oci_database', 'CpuUtilization[1m].mean() >= 90') +
        alarm(['STORAGEUTIL'], ['db', 'storageutil'], db_topic_key, 'oci_database', 'StorageUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'CPUUTIL'], ['vmc', 'cpuutil'], shared_infra_topic_key, 'oci_database_cluster', 'CpuUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'DISKUTIL'], ['vmc', 'dgutil'], shared_infra_topic_key, 'oci_database_cluster', 'ASMDiskgroupUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'FSUTIL'], ['vmc', 'fsutil'], db_topic_key, 'oci_database_cluster', 'FilesystemUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'MEMUTIL'], ['vmc', 'memutil'], shared_infra_topic_key, 'oci_database_cluster', 'MemoryUtilization[1m].mean() >= 80') +
        alarm(['DB', 'CLUSTER', 'SWAPUTIL'], ['vmc', 'swaputil'], shared_infra_topic_key, 'oci_database_cluster', 'SwapUtilization[1m].mean() >= 75')
      else {};

    {
      alarms: alarms,
      event_rules: event_rules,
      topics: topics,
    },
}
