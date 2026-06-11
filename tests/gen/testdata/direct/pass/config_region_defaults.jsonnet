// region defaults stay stable across defaulted and explicit config inputs
// covers FRA defaults, null-region fallback, null-realm fallback, and PHX naming
local multi = import 'gen/landing_zone_multi.jsonnet';
local base = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
};
local default_outputs = multi(base + { realm: 'oc1' });
local null_region_outputs = multi(base + {
  region: null,
  region_short_name: null,
  realm: 'oc1',
});
local null_realm_outputs = multi(base + { realm: null });
local phoenix_outputs = multi(base + {
  region: 'us-phoenix-1',
  region_short_name: 'phx',
  realm: 'oc1',
});
local summarize(outputs, region) =
  local network = outputs['network.json'];
  local categories = network.network_configuration.network_configuration_categories;
  local prod_projects_vcn = categories['1-prod'].vcns['VCN-%s-LZ-PROD-PROJECTS-KEY' % region];
  local prod_route_rules = prod_projects_vcn.route_tables['RT-%s-LZ-PROD-PROJ-GENERIC-KEY' % region].route_rules;
  {
    drg_keys: std.sort(std.objectFields(categories['0-shared'].non_vcn_specific_gateways.dynamic_routing_gateways)),
    route_keys: std.sort(std.objectFields(prod_route_rules)),
    hub_destination: prod_route_rules['rr-%s-hub' % std.asciiLower(region)].destination,
    internet_destination: prod_route_rules['rr-%s-natgw' % std.asciiLower(region)].destination,
    reporting_region: outputs['security_cis2.json'].cloud_guard_configuration.reporting_region,
  };
{
  default_region: summarize(default_outputs, 'FRA'),
  null_region: summarize(null_region_outputs, 'FRA'),
  null_realm: {
    summary: summarize(null_realm_outputs, 'FRA'),
    has_network_admin_policy:
      std.objectHas(null_realm_outputs['iam.json'].policies_configuration.supplied_policies, 'PCY-LZ-NETWORK-ADMIN-KEY'),
  },
  phoenix: summarize(phoenix_outputs, 'PHX'),
}
