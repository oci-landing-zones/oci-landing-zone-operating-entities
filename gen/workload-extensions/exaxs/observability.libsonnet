local events = import './events.libsonnet';

{
  render(inputs)::
    local n = inputs.naming;
    local scope = inputs.scope;
    local components = inputs.components;
    local cfg = inputs.config_params;
    local shared = scope.scope_type == 'shared';
    local segments = (if shared then ['SHARED'] else scope.key_segments) + ['EXAXS'];
    local scope_name = if shared then 'shared' else std.join('-', scope.name_segments);
    local platform_segments = scope.key_segments + [scope.platform_name];
    local db_key = n.key_global('CMP', platform_segments + ['DB']);
    local vault_key = n.key_global('CMP', platform_segments + ['INFRA']);
    local security_key = n.key_global('CMP', (if shared then [] else scope.key_segments) + ['SECURITY']);
    local topic_key = n.key_global('NOTT', segments + ['PLATFORM']);
    local emails =
      if std.objectHas(cfg, 'notification_emails') && std.objectHas(cfg.notification_emails, 'default') then
        cfg.notification_emails.default
      else ['exaxs-platform-team@example.com'];
    local topic = {
      name: n.display_global('nott', [scope_name, 'exaxs', 'platform']),
      description: 'ExaDB-XS Storage Vault, VM Cluster, and database notifications.',
      compartment_id: security_key,
      subscriptions: [{ protocol: 'EMAIL', values: emails }],
    };
    local rule(suffix, compartment, supplied_events) = {
      [n.key_global('RUL', segments + [suffix])]: {
        compartment_id: compartment,
        destination_topic_ids: [topic_key],
        event_display_name: n.display_global('rul', [scope_name, 'exaxs', std.asciiLower(suffix)]),
        supplied_events: supplied_events,
      },
    };
    local alarm(suffix, metric_compartment, namespace, query, severity='CRITICAL') = {
      [n.key_global('AL', segments + [suffix])]: {
        display_name: n.display_global('al', [scope_name, 'exaxs', std.asciiLower(suffix)]),
        compartment_id: metric_compartment,
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
    {
      topics: if components.infrastructure || components.database then { [topic_key]: topic } else {},
      event_rules:
        (if components.infrastructure then rule('VAULT', vault_key, events.vault) else {}) +
        (if components.database then
          rule('CLUSTER', db_key, events.cluster) +
          rule('DATABASE', db_key, events.database)
        else {}),
      alarms:
        if components.database then
          alarm('DB-CPU', db_key, 'oci_database', 'CpuUtilization[1m].mean() >= 90') +
          alarm('DB-STORAGE', db_key, 'oci_database', 'StorageUtilization[1h].mean() >= 90') +
          alarm('CLUSTER-CPU', db_key, 'oci_database_cluster', 'CpuUtilization[1m].mean() >= 90') +
          alarm('CLUSTER-FILESYSTEM', db_key, 'oci_database_cluster', 'FilesystemUtilization[1m].mean() >= 90') +
          alarm('CLUSTER-MEMORY', db_key, 'oci_database_cluster', 'MemoryUtilization[1m].mean() >= 80') +
          alarm('CLUSTER-NODE', db_key, 'oci_database_cluster', 'NodeStatus[1m].mean() < 1') +
          alarm('VAULT-UTILIZATION', db_key, 'oci_database_cluster', 'ExascaleVaultUtilization[1m].mean() >= 90')
        else {},
    },
}
