// gen/landing_zone_multi.jsonnet
// Usage: jsonnet --multi output/ --tla-code-file config=my_config.libsonnet gen/landing_zone_multi.jsonnet
function(config)
  local lz = import 'landing_zone.libsonnet';
  local result = lz(config);
  local cis_level = result.cis_level;
  local security_output(phase) =
    local security = result['security_cis%d%s' % [cis_level, phase]];
    if result.stack_scope != 'regional' then security else {
      [key]:
        if key != 'vaults_configuration' then security[key] else
          local vaults = security[key];
          {
            [field]: vaults[field]
            for field in std.objectFields(vaults)
            if field != 'keys' && field != 'existing_key_grants'
          } + {
            // Vault grant blocks create home-region IAM policies in the downstream module.
            [if std.objectHas(vaults, 'keys') then 'keys']: {
              [name]: {
                [field]: vaults.keys[name][field]
                for field in std.objectFields(vaults.keys[name])
                if !std.member(['service_grantees', 'group_grantees'], field)
              }
              for name in std.objectFields(vaults.keys)
            },
          }
      for key in std.objectFields(security)
      if !std.member(['cloud_guard_configuration', 'security_zones_configuration'], key)
    };
  local observability_output(phase) =
    local observability = result['observability_cis%d%s' % [cis_level, phase]];
    if result.stack_scope != 'regional' then observability else {
      [key]: observability[key]
      for key in std.objectFields(observability)
      if key != 'home_region_events_configuration'
    };

  {
    'network.json': result.network,
    ['security_cis%d_pre.json' % cis_level]: security_output('_pre'),
    ['security_cis%d.json' % cis_level]: security_output(''),
    ['observability_cis%d_pre.json' % cis_level]: observability_output('_pre'),
    ['observability_cis%d.json' % cis_level]: observability_output(''),
  }
  + (if std.objectHas(result, 'network_backends') && result.network_backends != null then { 'network_backends.json': result.network_backends } else {})
  + (if std.objectHas(result, 'extra') then { [key + '.json']: result.extra[key] for key in std.objectFields(result.extra) } else {})
  + (if result.stack_scope == 'complete' then {
       'iam.json': result.iam,
       'governance.json': result.governance,
     } else {})
