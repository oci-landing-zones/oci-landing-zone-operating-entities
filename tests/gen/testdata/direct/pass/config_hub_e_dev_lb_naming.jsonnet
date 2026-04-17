// dev-only config should name example hub LB after first ordered workload spoke, not hardcoded prod
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    dev: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
});
local lbs =
  outputs['network.json'].network_configuration.network_configuration_categories['0-shared']
    .non_vcn_specific_gateways.l7_load_balancers;
local lb_key = std.objectFields(lbs)[0];
local lb = lbs[lb_key];
{
  lb_key: lb_key,
  lb_display_name: lb.display_name,
  listener_keys: std.sort(std.objectFields(lb.listeners)),
  backend_set_keys: std.sort(std.objectFields(lb.backend_sets)),
  routing_policy_keys: std.sort(std.objectFields(lb.routing_policies)),
}
