// Combined examples deploy one independent Recipe 02 and zone per environment in one stack.
// contains: "passed": true
local combine = import 'gen/addons/oci-security-zones/combined.libsonnet';
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
local verify(inputs, cis_level) =
  local result = combine(inputs);
  local config = result.security_zones_configuration;
  local prod = render(inputs[0]).security_zones_configuration;
  local preprod = render(inputs[1]).security_zones_configuration;
  assert std.objectFields(result) == ['security_zones_configuration'];
  assert config.reporting_region == prod.reporting_region;
  assert config.recipes == prod.recipes + preprod.recipes;
  assert config.security_zones == prod.security_zones + preprod.security_zones;
  assert std.length(config.recipes) == 2 && std.length(config.security_zones) == 2;
  assert std.set([z.compartment_id for z in std.objectValues(config.security_zones)]) == ['CMP-LZ-PREPROD-KEY', 'CMP-LZ-PROD-KEY'];
  assert std.foldl(function(ok, recipe) ok && recipe.cis_level == std.toString(cis_level), std.objectValues(config.recipes), true);
  true;
assert verify(profiles.prod_preprod_cis1, 1);
assert verify(profiles.prod_preprod_cis2, 2);
assert combine([profiles.environment_cis1]) == render(profiles.environment_cis1);
{ passed: true }
