// Every hub emits complete routing; Hub C alternatives keep identical routes.
local multi = import 'gen/landing_zone_multi.jsonnet';
local addon = import 'gen/addons/oci-hub-models/published.libsonnet';
local profiles = import 'gen/addons/oci-hub-models/profiles.libsonnet';

local private_ip_targets(network) = std.uniq(std.sort([
  rule.network_entity_id
  for category in std.objectValues(network.network_configuration.network_configuration_categories)
  for vcn in std.objectValues(category.vcns)
  for rt in std.objectValues(vcn.route_tables)
  for rule in std.objectValues(rt.route_rules)
  if std.objectHas(rule, 'network_entity_id')
]));
local kinds = ['hub_a', 'hub_b', 'hub_c', 'hub_e'];
local outputs = {
  [kind]: multi({
    region: 'us-ashburn-1',
    region_short_name: 'iad',
    hub: { kind: kind, network: { vcn: '10.0.0.0/21' } },
    environments: { prod: { project_network: { network: { vcn: '10.0.64.0/21' } } } },
  })
  for kind in kinds
};
local published_hub_c = addon.render(profiles.hub_c.config);
{
  route_targets: { [kind]: private_ip_targets(outputs[kind]['network.json']) for kind in kinds },
  hub_c_backend_routes_match:
    outputs.hub_c['network.json'].network_configuration == outputs.hub_c['network_backends.json'].network_configuration,
  published_hub_c_backend_routes_match:
    published_hub_c.network.network_configuration == published_hub_c.network_backends.network_configuration,
}
