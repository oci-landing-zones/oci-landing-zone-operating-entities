// gen/landing_zone_multi.jsonnet
// Usage: jsonnet --multi output/ --tla-code-file config=my_config.libsonnet gen/landing_zone_multi.jsonnet
function(config)
  local lz = import 'landing_zone.libsonnet';
  local result = lz(config);

  // Common outputs (always generated)
  {
    'network.json': result.network,
    'iam.json': result.iam,
    'governance.json': result.governance,
    'security_cis1_pre.json': result.security_cis1_pre,
    'security_cis1.json': result.security_cis1,
    'security_cis2_pre.json': result.security_cis2_pre,
    'security_cis2.json': result.security_cis2,
    'observability_cis1_pre.json': result.observability_cis1_pre,
    'observability_cis1.json': result.observability_cis1,
    'observability_cis2_pre.json': result.observability_cis2_pre,
    'observability_cis2.json': result.observability_cis2,
  }
  // Conditional outputs
  + (if result.network_pre != null then { 'network_pre.json': result.network_pre } else {})
  + (if std.objectHas(result, 'network_backends') && result.network_backends != null then { 'network_backends.json': result.network_backends } else {})
  // Extension outputs (from result.extra)
  + (if std.objectHas(result, 'extra') then { [key + '.json']: result.extra[key] for key in std.objectFields(result.extra) } else {})
