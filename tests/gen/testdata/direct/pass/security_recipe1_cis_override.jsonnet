// Recipe 01 can override CIS without changing other recipes or baseline Vault generation.
local normalize = (import 'gen/config.libsonnet').normalize;
local security = import 'gen/builders/security.libsonnet';
local naming = import 'gen/naming.libsonnet';
local constants = import 'gen/constants.libsonnet';
local topology = import 'gen/topology.libsonnet';
local check(baseline, recipe) =
  local config = normalize({ cis_level: baseline, security_zone_recipe1_cis_level: recipe,
    hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } } });
  local n = naming(config.region_short_name);
  local outputs = security(config, n, constants[config.realm], topology(config, n));
  local output = outputs['cis%d' % baseline];
  local zones = output.security_zones_configuration;
  local recipe_key = 'SZ-RCP-LZ-01-CIS-L%d-KEY' % recipe;
  assert zones.recipes[recipe_key].cis_level == '%d' % recipe;
  assert zones.security_zones['SZ-TGT-LZ-CIS-L%d-KEY' % recipe].recipe_key == recipe_key;
  assert outputs['cis%d_pre' % baseline].security_zones_configuration.recipes[recipe_key].cis_level == '%d' % recipe;
  assert zones.recipes['SZ-RCP-LZ-02-SHARED-NETWORK-KEY'].cis_level == '%d' % baseline;
  assert std.objectHas(output, 'vaults_configuration') == (baseline == 2);
  true;
{ [std.toString(baseline) + '_' + std.toString(recipe)]: check(baseline, recipe)
  for baseline in [1, 2] for recipe in [1, 2] }
