// RPC routing follows arbitrary environment names and extension-backed platform VCNs.
// contains: "blue_route_count": 4
// contains: "local_vcn_count": 5
// contains: "oke_route_count": 16
// contains: "rpc_import_attachment_count": 5
// contains: "same_tenancy_iam_policy_count": 0
// contains: "sandbox_route_count": 4
local lz = import 'gen/landing_zone.libsonnet';

local rendered = lz({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  remote_peering_connections: {
    region_b: {
      remote_cidrs: [
        '10.1.0.0/21',
        '10.1.64.0/21',
        '10.1.80.0/20',
        '10.1.128.0/21',
      ],
      peer_id: 'RPC-AMS-LZ-HUB-REGION-A-KEY',
      peer_region_name: 'eu-amsterdam-1',
    },
  },
  environments: {
    blue: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '172.20.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
    sandbox: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
    },
    identity_only: {},
  },
  shared_platforms: {
    analytics: {
      network: {
        vcn: '10.0.144.0/21',
        subnets: { app: '10.0.144.0/24' },
      },
    },
  },
});

local categories = rendered.network.network_configuration.network_configuration_categories;
local drg = categories['0-shared'].non_vcn_specific_gateways
            .dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY'];
local rpc_distribution = drg.drg_route_distributions['DRGRD-FRA-LZ-RPC-REGION-B-KEY'];
local policy_count = std.length([
  key
  for key in std.objectFields(rendered.iam.policies_configuration.supplied_policies)
  if std.length(std.findSubstr('RPC', key)) > 0
]);
local rpc_route_count(category) = std.length(std.flattenArrays([
  [
    rule_key
    for rule_key in std.objectFields(category.vcns[vcn_key].route_tables[route_table_key].route_rules)
    if std.length(std.findSubstr('rpc', std.asciiLower(rule_key))) > 0
  ]
  for vcn_key in std.objectFields(category.vcns)
  for route_table_key in std.objectFields(category.vcns[vcn_key].route_tables)
]));

{
  // Hub plus two project VCNs, OKE VCN, and shared analytics VCN.
  local_vcn_count: std.length(std.objectFields(drg.drg_attachments)) - 1,
  rpc_import_attachment_count: std.length(std.objectFields(rpc_distribution.statements)),
  blue_route_count: rpc_route_count(categories['1-blue']),
  sandbox_route_count: rpc_route_count(categories['2-sandbox']),
  oke_route_count: rpc_route_count(categories['blue-platform-oke']),
  same_tenancy_iam_policy_count: policy_count,
}
