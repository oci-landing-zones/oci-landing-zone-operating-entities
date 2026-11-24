// Opting out of the shared-network zone leaves only the landing-zone baseline by default.
// contains: "verified": true
local render = import 'gen/landing_zone_multi.jsonnet';
local base = { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } }, environments: { prod: {} }, security_targets: [] };
local check(cis) =
  local file = 'security_cis%d.json' % cis;
  local single = render(base + { cis_level: cis, enable_shared_network_security_zone: false })[file].security_zones_configuration;
  local legacy = render(base + { cis_level: cis })[file].security_zones_configuration;
  local advanced = render(base + { cis_level: cis, enable_shared_network_security_zone: true, security_targets: ['prod'] })[file].security_zones_configuration;
  assert std.length(std.objectFields(single.recipes)) == 1;
  assert std.length(std.objectFields(single.security_zones)) == 1;
  assert std.objectValues(single.security_zones)[0].compartment_id == 'CMP-LANDINGZONE-KEY';
  assert std.length(std.objectFields(legacy.security_zones)) == 2;
  assert std.length(std.objectFields(advanced.security_zones)) == 3;
  true;
assert std.all([check(cis) for cis in [1, 2]]);
{ verified: true }
