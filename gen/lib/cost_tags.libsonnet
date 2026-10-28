// apply(doc, config): project cost tags from the normalized environment/platform context.
// Preserve explicit tags and apply metadata only at supported resource boundaries.
local environment_names = import 'environment_names.libsonnet';
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
  'virtual_node_pools',
  'ocvs_clusters',
];
local sections = {
  network_configuration: 'network',
  nlb_configuration: 'network',
  compartments_configuration: 'tobedefined',
  groups_configuration: 'tobedefined',
  dynamic_groups_configuration: 'tobedefined',
  policies_configuration: 'tobedefined',
  identity_domains_configuration: 'tobedefined',
  identity_domain_groups_configuration: 'tobedefined',
  identity_domain_dynamic_groups_configuration: 'tobedefined',
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
local ref(obj) = std.join('/', [
  obj[key]
  for key in ['compartment_id', 'default_compartment_id', 'parent_id']
  if std.objectHas(obj, key) && std.type(obj[key]) == 'string'
]);
local token(text, word) =
  std.length(std.findSubstr('-' + std.asciiUpper(std.strReplace(word, '_', '-')) + '-',
                            '-' + std.asciiUpper(std.strReplace(std.strReplace(text, '/', '-'), '_', '-')) + '-')) > 0;

{
  apply(doc, config)::
    local namespace = 'tagns-lz-cost-governance.tag-lz-';
    local workload_platforms = ['oke', 'ocvs', 'exacs', 'exacc', 'ebs', 'hpc', 'finops', 'ai-services'];
    local envs = std.objectFields(config.environments);
    local projects = std.set(std.flattenArrays([
      std.objectFields(config.environments[env].projects)
      for env in envs
      if std.objectHas(config.environments[env], 'projects')
    ]));
    local platform_entries =
      (if std.objectHas(config, 'shared_platforms') then [config.shared_platforms] else [])
      + [config.environments[env].platforms for env in envs if std.objectHas(config.environments[env], 'platforms')];
    local platform_types = std.foldl(function(acc, entry) acc + {
      [name]: if std.objectHas(entry[name], 'extension') then
        local kind = entry[name].extension.type;
        if kind == 'oke_simple' then 'oke' else kind
      else name
      for name in std.objectFields(entry)
    }, platform_entries, {});
    local most_specific(matches) =
      if std.length(matches) == 0 then []
      else local longest = std.foldl(function(length, name) std.max(length, std.length(name)), matches, 0);
           [name for name in matches if std.length(name) == longest];
    local values(path, platform, obj) =
      local primary = std.join('/', path);
      local env_matches(text) = [env for env in envs if token(text, env) || token(text, environment_names.label(env).short)];
      local direct_envs = env_matches(primary);
      local matched_envs = most_specific(if std.length(direct_envs) > 0 then direct_envs else env_matches(ref(obj)));
      local matched_projects = most_specific([project for project in projects if token(primary, project)]);
      local resource_key = if std.length(path) > 0 then path[std.length(path) - 1] else '';
      local compartment = std.startsWith(resource_key, 'CMP-');
      local matched_platforms = most_specific([name for name in std.objectFields(platform_types) if token(resource_key, name)]);
      local actual_platform =
        if platform != 'tobedefined' then platform
        else if compartment && token(resource_key, 'NETWORK') then 'network'
        else if compartment && token(resource_key, 'SECURITY') then 'security'
        else if compartment && std.length(matched_platforms) == 1 && std.member(workload_platforms, platform_types[matched_platforms[0]]) then platform_types[matched_platforms[0]]
        else 'tobedefined';
      {
        [namespace + 'cost-center']: 'tobedefined',
        [namespace + 'business-unit']: 'tobedefined',
        [namespace + 'owner']: 'tobedefined',
        [namespace + 'platform']: actual_platform,
        [namespace + 'environment']: if std.length(matched_envs) == 1 then matched_envs[0] else 'shared',
        [namespace + 'project']: if std.length(matched_projects) == 1 then matched_projects[0] else 'notapply',
      };
    local resource(obj, path, platform) =
      if std.type(obj) != 'object' then obj else
        local tagged = walk(obj, path=path, platform=platform);
        tagged { defined_tags: values(path, platform, obj) + tags(obj) } +
        (if std.member(path, 'clusters') && platform == 'oke' then {
           options+: {
             persistent_volume_config+: {
               defined_tags: values(path, 'oke', obj) + tags(if std.objectHas(obj, 'options') && std.objectHas(obj.options, 'persistent_volume_config') then obj.options.persistent_volume_config else {}),
             },
             service_lb_config+: {
               defined_tags: values(path, 'network', obj) + tags(if std.objectHas(obj, 'options') && std.objectHas(obj.options, 'service_lb_config') then obj.options.service_lb_config else {}),
             },
           },
         } else {}) +
        (if std.member(path, 'node_pools') && std.objectHas(obj, 'node_config_details') then {
           node_config_details+: { defined_tags: values(path, 'oke', obj) + tags(obj.node_config_details) },
         } else {}),
          walk(obj, path=[], platform='tobedefined') =
      if std.type(obj) == 'array' then [walk(v, path=path, platform=platform) for v in obj]
      else if std.type(obj) != 'object' then obj
      else {
        [key]:
          local value = obj[key];
          local child_path = path + [key];
          if key == 'tags_configuration' then value  // Definitions must not tag themselves during bootstrap.
          else if std.objectHas(sections, key) && std.type(value) == 'object' then
            walk(value, path=child_path, platform=sections[key]) +
            (if std.member(defaults_sections, key) then {
               default_defined_tags: values([], sections[key], value) + tags(value, field='default_defined_tags'),
             } else {})
          else if std.member(collections, key) && std.type(value) == 'object' then {
            [name]: resource(value[name], child_path + [name], platform)
            for name in std.objectFields(value)
          }
          else if key == 'default_security_list' && std.type(value) == 'object' then resource(value, child_path, platform)
          else walk(value, path=child_path, platform=platform)
        for key in std.objectFields(obj)
      };
    walk(doc),
}
