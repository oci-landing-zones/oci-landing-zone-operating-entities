// apply(doc, config): project cost tags from the normalized environment/platform context.
// Preserve explicit tags and apply metadata only at supported resource boundaries.
local cost_scope = import 'cost_scope.libsonnet';
local collections = [
  'compartments',
  'children',
  'groups',
  'dynamic_groups',
  'identity_domains',
  'supplied_policies',
  'vcns',
  'subnets',
  'route_tables',
  'security_lists',
  'network_security_groups',
  'internet_gateways',
  'nat_gateways',
  'service_gateways',
  'dynamic_routing_gateways',
  'drg_attachments',
  'drg_route_tables',
  'drg_route_distributions',
  'remote_peering_connections',
  'l7_load_balancers',
  'network_firewalls',
  'network_firewall_policies',
  'nlbs',
  'alarms',
  'event_rules',
  'topics',
  'buckets',
  'service_connectors',
  'log_groups',
  'flow_logs',
  'service_logs',
  'streams',
  'targets',
  'host_recipes',
  'host_targets',
  'recipes',
  'security_zones',
  'vaults',
  'keys',
  'clusters',
  'node_pools',
  'worker_pools',
  'virtual_node_pools',
  'ocvs_clusters',
];
local sections = {
  network_configuration: 'network',
  nlb_configuration: 'network',
  compartments_configuration: 'iam',
  groups_configuration: 'iam',
  dynamic_groups_configuration: 'iam',
  policies_configuration: 'iam',
  identity_domains_configuration: 'iam',
  identity_domain_groups_configuration: 'iam',
  identity_domain_dynamic_groups_configuration: 'iam',
  alarms_configuration: 'observability',
  events_configuration: 'observability',
  home_region_events_configuration: 'observability',
  notifications_configuration: 'observability',
  logging_configuration: 'observability',
  service_connectors_configuration: 'observability',
  streams_configuration: 'observability',
  cloud_guard_configuration: 'security',
  scanning_configuration: 'security',
  security_zones_configuration: 'security',
  vaults_configuration: 'security',
  bastions_configuration: 'security',
  zpr_configuration: 'security',
  oke_clusters_configuration: 'oke',
  oke_workers_configuration: 'oke',
  oke_configuration: 'oke',
  ocvs_configuration: 'ocvs',
};
local defaults_sections = [
  'alarms_configuration',
  'events_configuration',
  'home_region_events_configuration',
  'notifications_configuration',
  'logging_configuration',
  'service_connectors_configuration',
  'streams_configuration',
  'cloud_guard_configuration',
  'scanning_configuration',
  'security_zones_configuration',
  'vaults_configuration',
  'bastions_configuration',
  'oke_clusters_configuration',
  'oke_workers_configuration',
  'ocvs_configuration',
];
local tags(obj, field='defined_tags') =
  if std.objectHas(obj, field) && obj[field] != null then obj[field] else {};
local without_cost_tags(value) =
  local prefix = 'tagns-lz-cost-governance.';
  local fields = ['defined_tags', 'default_defined_tags', 'node_defined_tags'];
  local filtered_tags(tags) = { [key]: tags[key] for key in std.objectFields(tags) if !std.startsWith(key, prefix) };
  if std.type(value) == 'array' then [without_cost_tags(item) for item in value]
  else if std.type(value) != 'object' then value
  else {
    [key]:
      local child = value[key];
      if std.member(fields, key) && std.type(child) == 'object' then filtered_tags(child)
      else if key == 'namespaces' && std.type(child) == 'object' then {
        [name]: without_cost_tags(child[name])
        for name in std.objectFields(child)
        if !std.objectHas(child[name], 'name') || child[name].name != 'tagns-lz-cost-governance'
      }
      else if key == 'budgets' && std.type(child) == 'object' then {
        [name]: without_cost_tags(child[name])
        for name in std.objectFields(child)
        if !std.objectHas(child[name], 'target') || child[name].target.type != 'TAG' ||
           std.length([target for target in child[name].target.values if std.startsWith(target, prefix)]) == 0
      }
      else without_cost_tags(child)
    for key in std.objectFields(value)
    if !(std.member(fields, key) && std.type(value[key]) == 'object' && std.length(std.objectFields(filtered_tags(value[key]))) == 0)
  };

{
  apply(doc, config)::
    if std.objectHas(config, 'cost_governance') && std.objectHas(config.cost_governance, 'enable_tags') && !config.cost_governance.enable_tags then without_cost_tags(doc) else
    local namespace = 'tagns-lz-cost-governance.tag-lz-';
    local owner = if std.objectHas(config, 'cost_governance') && std.objectHas(config.cost_governance, 'owner_email') then config.cost_governance.owner_email else null;
    local owner_tags = if owner != null then { [namespace + 'owner']: owner } else {};
    local assigned_tags(obj, field='defined_tags') = tags(obj, field=field) + owner_tags;
    local center_field = namespace + 'cost-center';
    local center_rules = if std.objectHas(config, 'cost_governance') && std.objectHas(config.cost_governance, 'cost_center_assignments') then config.cost_governance.cost_center_assignments else {};
    local assign_center_only(assigned) =
      // Explicit cost-center tags (including a budget's target) remain authoritative.
      if std.objectHas(assigned, center_field) && assigned[center_field] != 'tobedefined' then assigned else
      local matches = [center for center in std.objectFields(center_rules)
        if std.length([dimension for dimension in ['platform', 'environment', 'project']
          if std.objectHas(center_rules[center], dimension) && center_rules[center][dimension] != null &&
             std.length(center_rules[center][dimension]) > 0 &&
             !std.member(center_rules[center][dimension], if std.objectHas(assigned, namespace + dimension) then assigned[namespace + dimension] else 'tobedefined')]) == 0];
      assert std.length(matches) <= 1 : 'Multiple cost centers match a resource: ' + std.join(', ', matches);
      assigned + (if std.length(matches) == 1 then { [center_field]: matches[0] } else {});
    local assign_center(assigned) =
      local tagged = assign_center_only(assigned);
      local units = if std.objectHas(config, 'cost_governance') && std.objectHas(config.cost_governance, 'cost_center_business_units') then config.cost_governance.cost_center_business_units else {};
      tagged + (if std.objectHas(tagged, center_field) && std.objectHas(units, tagged[center_field]) then { [namespace + 'business-unit']: units[tagged[center_field]] } else {});

    local scope_index = cost_scope.index(doc, config);
    local values(scope, platform) =
      {
        [namespace + 'cost-center']: 'tobedefined',
        [namespace + 'business-unit']: 'tobedefined',
        [namespace + 'owner']: 'tobedefined',
        [namespace + 'platform']: platform,
        [namespace + 'environment']: scope.environment,
        [namespace + 'project']: scope.project,
      };
    local resource(obj, path, platform, inherited_scope, key, compartment=false) =
      if std.type(obj) != 'object' then obj else
        local scope =
          if std.objectHasAll(obj, '_cost_scope') then obj._cost_scope
          else if compartment && std.objectHas(scope_index, key) then scope_index[key]
          else cost_scope.for_object(obj, inherited_scope, scope_index);
        local actual_platform =
          if std.objectHasAll(obj, '_cost_platform') then obj._cost_platform
          else if compartment && std.objectHas(scope_index, key) && std.objectHas(scope_index[key], 'platform') then scope_index[key].platform
          else platform;
        local resource_values = values(scope, actual_platform);
        local oke_values = values(scope, 'oke');
        local tagged = walk(obj, path=path, platform=platform, scope=scope);
        tagged { defined_tags: assign_center(resource_values + assigned_tags(obj)) } +
        (if (std.member(path, 'clusters') || std.member(path, 'cluster_configuration')) && platform == 'oke' then {
           options+: {
             persistent_volume_config+: {
               defined_tags: assign_center(oke_values + assigned_tags(if std.objectHas(obj, 'options') && std.objectHas(obj.options, 'persistent_volume_config') then obj.options.persistent_volume_config else {})),
             },
             service_lb_config+: {
               defined_tags: assign_center((resource_values + { [namespace + 'platform']: 'network' }) + assigned_tags(if std.objectHas(obj, 'options') && std.objectHas(obj.options, 'service_lb_config') then obj.options.service_lb_config else {})),
             },
           },
         } else {}) +
        (if std.member(path, 'node_pools') && std.objectHas(obj, 'node_config_details') then {
           node_config_details+: { defined_tags: assign_center(oke_values + assigned_tags(obj.node_config_details)) },
         } else {}) +
        (if std.member(path, 'worker_pools') && platform == 'oke' then {
           node_defined_tags: assign_center(oke_values + assigned_tags(obj, field='node_defined_tags')),
         } else {}),
          walk(obj, path=[], platform='tobedefined', scope=cost_scope.shared) =
      if std.type(obj) == 'array' then [walk(v, path=path, platform=platform, scope=scope) for v in obj]
      else if std.type(obj) != 'object' then obj
      else local own_scope = cost_scope.for_object(obj, scope, scope_index);
      {
        [key]:
          local value = obj[key];
          local child_path = path + [key];
          if key == 'tags_configuration' then value  // Definitions must not tag themselves during bootstrap.
          else if std.member(['defined_tags', 'default_defined_tags', 'node_defined_tags'], key) && std.type(value) == 'object' then assign_center(value + owner_tags)
          else if std.objectHas(sections, key) && std.type(value) == 'object' then
            walk(value, path=child_path, platform=sections[key], scope=own_scope) +
            (if std.member(defaults_sections, key) then {
               default_defined_tags: assign_center(values(cost_scope.for_object(value, own_scope, scope_index), sections[key]) + assigned_tags(value, field='default_defined_tags')),
             } else {})
          else if std.member(collections, key) && std.type(value) == 'object' then {
            [name]: resource(value[name], child_path + [name], platform, own_scope, name, compartment=key == 'compartments' || key == 'children')
            for name in std.objectFields(value)
          }
          else if (key == 'default_security_list' || (key == 'cluster_configuration' && platform == 'oke')) && std.type(value) == 'object' then resource(value, child_path, platform, own_scope, key)
          else walk(value, path=child_path, platform=platform, scope=own_scope)
        for key in std.objectFields(obj)
      };
    walk(doc),
}
