// Published One-OE retains its services but creates only the landing-zone baseline recipe and zone.
// contains: "passed": true
local lz = import 'gen/landing_zone.libsonnet';
local profiles = import 'gen/blueprints/one-oe/runtime/one-stack/profiles.libsonnet';
local legacy = lz(profiles.hub_a.config);
local verify(actual, baseline, level) =
  local zones = actual.security_zones_configuration;
  local targets = std.objectValues(zones.security_zones);
  local recipes = std.objectValues(zones.recipes);
  assert std.length(recipes) == 1 : 'Published One-OE must create only Recipe 01';
  assert std.length(targets) == 1 && targets[0].compartment_id == 'CMP-LANDINGZONE-KEY';
  assert recipes[0].cis_level == std.toString(level);
  assert recipes[0].compartment_id == 'CMP-LZ-SECURITY-KEY';
  assert zones.recipes[targets[0].recipe_key] == recipes[0];
  assert actual.cloud_guard_configuration == baseline.cloud_guard_configuration;
  assert actual.scanning_configuration == baseline.scanning_configuration;
  assert { [k]: actual[k] for k in std.objectFields(actual) if k != 'security_zones_configuration' }
      == { [k]: baseline[k] for k in std.objectFields(baseline) if k != 'security_zones_configuration' };
  assert !std.objectHas(recipes[0], 'security_policies_ocids');
  true;
assert verify(import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet', legacy.security_cis1_pre, 1);
assert verify(import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis2.jsonnet', legacy.security_cis2_pre, 2);
{ passed: true }
