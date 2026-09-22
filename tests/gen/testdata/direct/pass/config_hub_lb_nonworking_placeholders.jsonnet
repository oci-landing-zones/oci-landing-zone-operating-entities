// Without a normalized shared `web` subnet, the public hub LB remains an
// intentionally non-working example and does not infer a workload endpoint.
local multi = import 'gen/landing_zone_multi.jsonnet';

local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: {
        network: {
          vcn: '10.0.64.0/21',
          subnets: { frontend: '10.0.64.0/24' },
        },
      },
    },
  },
});
local shared = outputs['network.json'].network_configuration
  .network_configuration_categories['0-shared'];
local lbs = shared.non_vcn_specific_gateways.l7_load_balancers;
local lb = lbs[std.objectFields(lbs)[0]];
local backend_ips = std.sort([
  lb.backend_sets[backend_set_key].backends[backend_key].ip_address
  for backend_set_key in std.objectFields(lb.backend_sets)
  for backend_key in std.objectFields(lb.backend_sets[backend_set_key].backends)
]);

{
  backend_ips: backend_ips,
}
