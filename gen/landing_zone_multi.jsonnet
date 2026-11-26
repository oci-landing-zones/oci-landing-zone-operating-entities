// gen/landing_zone_multi.jsonnet
// Usage: jsonnet --multi output/ --tla-code-file config=my_config.libsonnet gen/landing_zone_multi.jsonnet
function(config)
  local lz = import 'landing_zone.libsonnet';
  local normalized = (import 'config.libsonnet').normalize(config);
  // Home owns globals for the Primary topology, including region-qualified RPC IAM.
  local render_config = if normalized.stack_scope != 'home' then config else config + {
    stack_scope: 'complete', region: normalized.primary_region,
    region_short_name: normalized.primary_region_short_name,
  };
  local result = lz(render_config);
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
  local observability_output =
    local observability = result['observability_cis%d' % cis_level];
    if result.stack_scope != 'regional' then observability else {
      [key]: observability[key]
      for key in std.objectFields(observability)
      if key != 'home_region_events_configuration'
    };

  local security_pre = security_output('_pre');
  local security_final = security_output('');
  local outputs = {
    'network.json': result.network,
    [if security_pre != security_final then 'security_cis%d_pre.json' % cis_level]: security_pre,
    ['security_cis%d.json' % cis_level]: security_final,
    ['observability_cis%d.json' % cis_level]: observability_output,
  }
  + (if std.objectHas(result, 'network_backends') && result.network_backends != null then { 'network_backends.json': result.network_backends } else {})
  + (if std.objectHas(result, 'extra') then { [key + '.json']: result.extra[key] for key in std.objectFields(result.extra) } else {})
  + (if result.stack_scope == 'complete' then {
       'iam.json': result.iam,
       'governance.json': result.governance,
     } else {});
  if std.member(['home', 'primary'], normalized.stack_scope) then
    (import 'lib/deployment_scopes.libsonnet')(outputs, normalized.stack_scope, normalized.region)
  else outputs
