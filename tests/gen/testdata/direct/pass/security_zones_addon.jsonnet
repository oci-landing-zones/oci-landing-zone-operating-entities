// The add-on publishes only Recipe 02 per environment; the base blueprint owns Recipe 01.
// contains: "passed": true
local render = import 'gen/addons/oci-security-zones/published.libsonnet';
local profiles = import 'gen/addons/oci-security-zones/profiles.libsonnet';
local constants = import 'gen/constants.libsonnet';
local verify(profile) =
  local result = render(profile);
  local config = result.security_zones_configuration;
  local recipes = std.objectFields(config.recipes);
  local zones = std.objectFields(config.security_zones);
  local recipe = config.recipes[recipes[0]];
  local zone = config.security_zones[zones[0]];
  local realm = if std.objectHas(profile, 'realm') then profile.realm else 'oc1';
  assert std.objectFields(result) == ['security_zones_configuration'];
  assert std.length(recipes) == 1 && std.length(zones) == 1;
  assert recipes[0] == 'SZ-RCP-LZ-02-%s-ENVIRONMENT-KEY' % std.asciiUpper(profile.environment_name);
  assert recipe.name == 'sz-rcp-lz-02-%s-environment' % std.asciiLower(profile.environment_name);
  assert recipe.cis_level == std.toString(profile.cis_level);
  assert recipe.compartment_id == profile.recipe_compartment_id;
  assert recipe.security_policies_ocids == constants[realm].security_zone_policy_ocids.environment;
  assert std.length(recipe.security_policies_ocids) == 26;
  assert zone.compartment_id == profile.target_compartment_id;
  assert zone.recipe_key == recipes[0];
  assert config.reporting_region == profile.reporting_region;
  assert !std.objectHas(config, 'tenancy_ocid');
  true;
assert std.objectFields(profiles) == ['environment_cis1', 'environment_cis2', 'prod_preprod_cis1', 'prod_preprod_cis2'] :
       'The add-on must expose only single and combined environment presets';
assert verify(profiles.environment_cis1) && verify(profiles.environment_cis2);
assert profiles.environment_cis1.cis_level == 1 && profiles.environment_cis2.cis_level == 2;
assert std.objectFields(render(profiles.environment_cis1).security_zones_configuration.recipes)
    == std.objectFields(render(profiles.environment_cis2).security_zones_configuration.recipes);
assert verify(profiles.environment_cis2 + {
  environment_name: 'qa',
  realm: 'oc19',
  reporting_region: 'eu-madrid-2',
  recipe_compartment_id: 'ocid1.compartment.oc19..example-security',
  target_compartment_id: 'ocid1.compartment.oc19..example-qa',
});
{ passed: true }
