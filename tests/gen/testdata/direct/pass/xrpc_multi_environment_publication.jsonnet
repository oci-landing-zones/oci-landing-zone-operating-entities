// Published X-RPC fragments retain routing for every generated environment VCN.
// contains: "environment_category_count": 3
// contains: "preprod_remote_route_count": 4
// contains: "prod_remote_route_count": 4
// contains: "rpc_import_attachment_count": 4
// contains: "rpc_route_table_import_distribution": "DRGRD-FRA-LZ-RPC-TENANCY1-KEY"
// contains: "same_tenancy_iam_policy_count": 0
// contains: "uat_remote_route_count": 4
local published = import 'gen/addons/oci-x-rpc/published.libsonnet';

local config = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: { kind: 'hub_e', network: { vcn: '10.1.0.0/21' } },
  remote_peering_connections: {
    tenancy1: {
      remote_cidrs: [
        '10.0.0.0/21',
        '10.0.64.0/21',
        '10.0.128.0/21',
        '10.0.192.0/21',
      ],
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.example',
      peer_region_name: 'eu-frankfurt-1',
    },
  },
  environments: {
    prod: { shared_project_network: { network: { vcn: '10.1.64.0/21' } } },
    preprod: { shared_project_network: { network: { vcn: '10.1.128.0/21' } } },
    uat: { shared_project_network: { network: { vcn: '10.1.192.0/21' } } },
  },
};

local fragment = published.network_fragment(config);
local iam_fragment = published.iam_fragment(config);
local categories = fragment.network_configuration.network_configuration_categories;
local drg = categories['0-shared'].non_vcn_specific_gateways
  .dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY'];
local rpc_distribution = drg.drg_route_distributions['DRGRD-FRA-LZ-RPC-TENANCY1-KEY'];
local rpc_route_table = drg.drg_route_tables['DRGRT-FRA-LZ-RPC-TENANCY1-KEY'];
local environment_categories = [
  categories[category_key]
  for category_key in std.objectFields(categories)
  if category_key != '0-shared'
];
local remote_route_count(category) = std.length(std.flattenArrays([
  std.objectFields(category.vcns[vcn_key].route_tables[route_table_key].route_rules)
  for vcn_key in std.objectFields(category.vcns)
  for route_table_key in std.objectFields(category.vcns[vcn_key].route_tables)
]));

{
  environment_category_count: std.length(environment_categories),
  preprod_remote_route_count: remote_route_count(categories['2-preprod']),
  prod_remote_route_count: remote_route_count(categories['1-prod']),
  rpc_import_attachment_count: std.length(std.objectFields(rpc_distribution.statements)),
  rpc_route_table_import_distribution: rpc_route_table.import_drg_route_distribution_key,
  same_tenancy_iam_policy_count:
    std.length(std.objectFields(iam_fragment.policies_configuration.supplied_policies)),
  uat_remote_route_count: remote_route_count(categories['3-uat']),
}
