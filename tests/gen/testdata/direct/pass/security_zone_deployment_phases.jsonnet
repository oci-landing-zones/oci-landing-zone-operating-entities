// Security bootstrap is emitted only for extra zone associations; new environment numbering is opt-in.
// contains: "verified": true
local render = import 'gen/landing_zone_multi.jsonnet';
local base = {
  cis_level: 1, hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} }, enable_shared_network_security_zone: false,
  security_targets: [], security_zone_environment_recipe_number: 2,
};
local check(cis) =
  local config = base + { cis_level: cis };
  local pre = 'security_cis%d_pre.json' % cis;
  local final = 'security_cis%d.json' % cis;
  local single = render(config);
  local phased = render(config + { security_targets: ['prod'] });
  local regional = render(config + { stack_scope: 'regional', security_targets: ['prod'] });
  local legacy = render(config + { security_targets: ['prod'], security_zone_environment_recipe_number: 3 });
  assert !std.objectHas(single, pre) && std.objectHas(single, final);
  assert std.objectHas(phased, pre) && phased[pre] != phased[final];
  assert std.length(std.objectFields(phased[pre].security_zones_configuration.security_zones)) == 1;
  assert std.length(std.objectFields(phased[final].security_zones_configuration.security_zones)) == 2;
  assert std.objectHas(phased[final].security_zones_configuration.recipes, 'SZ-RCP-LZ-02-PROD-ENVIRONMENT-KEY');
  assert std.objectHas(legacy[final].security_zones_configuration.recipes, 'SZ-RCP-LZ-03-PROD-ENVIRONMENT-KEY');
  assert !std.objectHas(regional, pre);
  true;
assert std.all([check(cis) for cis in [1, 2]]);
{ verified: true }
