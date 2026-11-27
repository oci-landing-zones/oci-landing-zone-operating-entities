// Published Recipe 02 alternatives for an existing environment compartment.
local common = {
  realm: 'oc1',
  reporting_region: 'eu-frankfurt-1',
  recipe_compartment_id: 'CMP-LZ-SECURITY-KEY',
  environment_name: 'prod',
  target_compartment_id: 'CMP-LZ-PROD-KEY',
};
local prod(cis_level) = common + { cis_level: cis_level };

{
  environment_cis1: prod(1),
  environment_cis2: prod(2),
}
