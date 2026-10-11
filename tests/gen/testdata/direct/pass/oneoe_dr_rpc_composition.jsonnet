// Independent DR configs preserve ownership boundaries and explicit RPC roles.
// contains: "regional_output_ownership": true
// contains: "explicit_rpc_roles": true
local generate = import 'gen/landing_zone_multi.jsonnet';
local profiles = import 'gen/addons/oci-lz-dr/one-oe/profiles.libsonnet';
local home_config = profiles.home_hub_b;
local dr_config = profiles.hub_b;

local home = generate(home_config);
local dr = generate(dr_config);
local categories(network) = std.objectValues(
  network.network_configuration.network_configuration_categories
);
local rpc_entries(network) = std.flattenArrays([
  [
    { key: key, value: drg.remote_peering_connections[key] }
    for key in std.objectFields(drg.remote_peering_connections)
  ]
  for category in categories(network)
  if std.objectHas(category, 'non_vcn_specific_gateways')
  for drg in std.objectValues(
    category.non_vcn_specific_gateways.dynamic_routing_gateways
  )
  if std.objectHas(drg, 'remote_peering_connections')
]);
local home_rpcs = rpc_entries(home['network.json']);
local dr_rpcs = rpc_entries(dr['network.json']);

{
  regional_output_ownership:
    std.objectHas(home, 'iam.json') &&
    std.objectHas(home, 'governance.json') &&
    !std.objectHas(dr, 'iam.json') &&
    !std.objectHas(dr, 'governance.json') &&
    !std.objectHas(dr['security_cis2.json'], 'vaults_configuration') &&
    !std.objectHas(dr['security_cis2.json'], 'security_zones_configuration'),
  explicit_rpc_roles:
    std.length(home_rpcs) == 1 &&
    std.length(dr_rpcs) == 1 &&
    !std.objectHas(home_rpcs[0].value, 'peer_key') &&
    dr_rpcs[0].value.peer_key == home_rpcs[0].key &&
    home_rpcs[0].value.peer_region_name == dr_config.region &&
    dr_rpcs[0].value.peer_region_name == home_config.region,
}
