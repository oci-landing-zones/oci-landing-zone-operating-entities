// Disabling Recipe 01 preserves encryption and independently selected Advanced zones.
// contains: "verified": true
local lz = import 'gen/landing_zone.libsonnet';
local config = { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } }, enable_landing_zone_security_zone: false, enable_shared_network_security_zone: false, security_targets: [] };
local result = lz(config);
assert std.foldl(function(ok, key)
  local security = result[key];
  ok && security.security_zones_configuration.recipes == {} && security.security_zones_configuration.security_zones == {},
  ['security_cis1_pre', 'security_cis1', 'security_cis2_pre', 'security_cis2'], true);
assert std.objectHas(result.security_cis2, 'vaults_configuration');
local advanced = lz(config + { enable_shared_network_security_zone: true });
assert std.length(std.objectFields(advanced.security_cis1.security_zones_configuration.recipes)) == 1;
assert std.length(std.objectFields(advanced.security_cis1.security_zones_configuration.security_zones)) == 1;
{ verified: true }
