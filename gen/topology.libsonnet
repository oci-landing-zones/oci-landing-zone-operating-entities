// gen/topology.libsonnet
// Shared semantic helpers for environment labels, platform placement, and security targeting.
//
// function(config, n) -> topology helper object

function(config, n)
  local raw_env_names = std.objectFields(config.environments);
  local preferred_env_names = ['prod', 'preprod', 'staging', 'uat', 'dev', 'test'];
  local ordered_env_names =
    [name for preferred_name in preferred_env_names for name in raw_env_names if name == preferred_name]
    + [name for name in raw_env_names if !std.member(preferred_env_names, name)];
  local ordered_spoke_env_names = [
    env_name
    for env_name in ordered_env_names
    if std.objectHas(config.environments[env_name], 'shared_project_network')
  ];
  local security_target_env_names =
    if std.objectHas(config, 'security_targets') && config.security_targets != null then
      assert std.type(config.security_targets) == 'array' :
        'config.security_targets must be an array';
      assert std.all([
        std.member(raw_env_names, env_name)
        for env_name in config.security_targets
      ]) :
        'config.security_targets must only reference defined environments: %s' % std.join(', ', [
          env_name
          for env_name in config.security_targets
          if !std.member(raw_env_names, env_name)
        ]);
      [
        env_name
        for env_name in ordered_env_names
        if std.member(config.security_targets, env_name)
      ]
    else
      ordered_env_names;

  local env_labels = {
    prod: { short: 'Prod', long: 'Production', network: 'Prod', dns: 'p' },
    preprod: { short: 'PreProd', long: 'Pre-Production', network: 'Pre-Production', dns: 'pp' },
    dev: { short: 'Dev', long: 'Dev', network: 'Dev', dns: 'd' },
    staging: { short: 'Staging', long: 'Staging', network: 'Staging', dns: 'st' },
    uat: { short: 'UAT', long: 'UAT', network: 'UAT', dns: 'ua' },
    test: { short: 'Test', long: 'Test', network: 'Test', dns: 't' },
  };

  local title_case(name) = std.asciiUpper(name[0:1]) + name[1:];
  local env_label(env_name) =
    if std.objectHas(env_labels, env_name) then env_labels[env_name]
    else {
      short: title_case(env_name),
      long: title_case(env_name),
      network: title_case(env_name),
      dns: env_name[0:2],
    };

  local platform_scope(scope_name, platform_name, is_shared=false) =
    local platform_title = title_case(platform_name);
    {
      scope_type: if is_shared then 'shared' else 'environment',
      scope_name: scope_name,
      scope_title: if is_shared then 'Shared' else env_label(scope_name).short,
      scope_long_title: if is_shared then 'Shared' else env_label(scope_name).long,
      dns: if is_shared then 'sh' else env_label(scope_name).dns,
      platform_name: platform_name,

      compartment_key:
        if is_shared then n.key_global('CMP', ['SHARED', 'PLATFORM', platform_name])
        else n.key_global('CMP', [scope_name, 'PLATFORM', platform_name]),
      parent_compartment_key:
        if is_shared then n.key_global('CMP', ['PLATFORM'])
        else n.key_global('CMP', [scope_name, 'PLATFORM']),
      compartment_name:
        if is_shared then 'cmp-lz-platform-%s' % std.asciiLower(platform_name)
        else 'cmp-lz-%s-platform-%s' % [std.asciiLower(scope_name), std.asciiLower(platform_name)],
      compartment_description:
        if is_shared then 'Shared Platform %s Compartment' % platform_title
        else '%s Platform %s Compartment' % [env_label(scope_name).long, platform_title],
      compartment_path:
        if is_shared then n.compartment_path(['platform', platform_name])
        else n.compartment_path([scope_name, 'platform', platform_name]),

      network_compartment_key:
        if is_shared then n.key_global('CMP', ['NETWORK'])
        else n.key_global('CMP', [scope_name, 'NETWORK']),
      network_compartment_path:
        if is_shared then n.compartment_path(['network'])
        else n.compartment_path([scope_name, 'network']),

      allow_security_target:
        if is_shared then true
        else std.member(security_target_env_names, scope_name),
    };

  {
    ordered_env_names():: ordered_env_names,
    ordered_spoke_env_names():: ordered_spoke_env_names,

    env_label(env_name):: env_label(env_name),
    env_display(env_name):: self.env_label(env_name).short,
    env_display_long(env_name):: self.env_label(env_name).long,
    env_display_network(env_name):: self.env_label(env_name).network,
    env_dns(env_name):: self.env_label(env_name).dns,

    env_platform(env_name, platform_name):: platform_scope(env_name, platform_name, false),
    shared_platform(platform_name):: platform_scope('shared', platform_name, true),

    security_target_env_names():: security_target_env_names,
  }
