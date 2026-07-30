// A connectivity tenancy accepts independent production and non-production RPCs.
// contains: "connectivity_rpc_attachment_count": 2
// contains: "connectivity_rpc_count": 2
// contains: "connectivity_rpc_policy_count": 2
// contains: "connectivity_rpc_route_table_count": 2
// contains: "nonprod_environment_count": 4
// contains: "nonprod_rpc_import_attachment_count": 5
// contains: "nonprod_rpc_policy_count": 1
// contains: "prod_environment_count": 3
// contains: "prod_rpc_import_attachment_count": 4
// contains: "prod_rpc_policy_count": 1
local lz = import 'gen/landing_zone.libsonnet';

local connectivity = lz({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_a',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    connectivity: {},
  },
  remote_peering_connections: {
    prod: {
      remote_cidrs: [
        '10.1.0.0/21',
        '10.1.64.0/21',
        '10.1.128.0/21',
        '10.1.192.0/21',
      ],
      peer_region_name: 'eu-amsterdam-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..production',
      requestor_group_ocid: 'ocid1.group.oc1..production-network-admin',
    },
    nonprod: {
      remote_cidrs: [
        '10.2.0.0/21',
        '10.2.64.0/21',
        '10.2.128.0/21',
        '10.2.192.0/21',
        '10.2.224.0/21',
      ],
      peer_region_name: 'eu-amsterdam-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..nonproduction',
      requestor_group_ocid: 'ocid1.group.oc1..nonproduction-network-admin',
    },
  },
});

local prod = lz({
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.1.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.1.64.0/21' } },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.1.128.0/21' } },
    },
    dr: {
      shared_project_network: { network: { vcn: '10.1.192.0/21' } },
    },
  },
  remote_peering_connections: {
    connectivity: {
      remote_cidrs: ['10.0.0.0/21'],
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.prod',
      peer_region_name: 'eu-frankfurt-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..connectivity',
      requestor_group_ocid: 'ocid1.group.oc1..production-network-admin',
    },
  },
});

local nonprod = lz({
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.2.0.0/21' },
  },
  environments: {
    uat: {
      shared_project_network: { network: { vcn: '10.2.64.0/21' } },
    },
    dev: {
      shared_project_network: { network: { vcn: '10.2.128.0/21' } },
    },
    test: {
      shared_project_network: { network: { vcn: '10.2.192.0/21' } },
    },
    sandbox: {
      shared_project_network: { network: { vcn: '10.2.224.0/21' } },
    },
  },
  remote_peering_connections: {
    connectivity: {
      remote_cidrs: ['10.0.0.0/21'],
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.nonprod',
      peer_region_name: 'eu-frankfurt-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..connectivity',
      requestor_group_ocid: 'ocid1.group.oc1..nonproduction-network-admin',
    },
  },
});

local categories(rendered) =
  rendered.network.network_configuration.network_configuration_categories;
local drg(rendered, key) =
  categories(rendered)['0-shared'].non_vcn_specific_gateways
    .dynamic_routing_gateways[key];
local rpc_policy_count(rendered) =
  std.length([
    key
    for key in std.objectFields(rendered.iam.policies_configuration.supplied_policies)
    if std.length(std.findSubstr('RPC', key)) > 0
  ]);
local rpc_attachment_count(rendered, key) =
  std.length([
    attachment_key
    for attachment_key in std.objectFields(drg(rendered, key).drg_attachments)
    if drg(rendered, key).drg_attachments[attachment_key].network_details.type
       == 'REMOTE_PEERING_CONNECTION'
  ]);
local rpc_route_table_count(rendered, key) =
  std.length([
    route_table_key
    for route_table_key in std.objectFields(drg(rendered, key).drg_route_tables)
    if std.length(std.findSubstr('RPC', route_table_key)) > 0
  ]);
local environment_count(rendered) =
  std.length([
    category_key
    for category_key in std.objectFields(categories(rendered))
    if category_key != '0-shared'
  ]);
local rpc_import_attachment_count(rendered, key) =
  std.length(std.objectFields(
    drg(rendered, 'DRG-AMS-LZ-HUB-KEY').drg_route_distributions[key].statements
  ));

{
  connectivity_rpc_count:
    std.length(std.objectFields(
      drg(connectivity, 'DRG-FRA-LZ-HUB-KEY').remote_peering_connections
    )),
  connectivity_rpc_attachment_count:
    rpc_attachment_count(connectivity, 'DRG-FRA-LZ-HUB-KEY'),
  connectivity_rpc_route_table_count:
    rpc_route_table_count(connectivity, 'DRG-FRA-LZ-HUB-KEY'),
  connectivity_rpc_policy_count: rpc_policy_count(connectivity),
  prod_environment_count: environment_count(prod),
  prod_rpc_import_attachment_count:
    rpc_import_attachment_count(prod, 'DRGRD-AMS-LZ-RPC-CONNECTIVITY-KEY'),
  prod_rpc_policy_count: rpc_policy_count(prod),
  nonprod_environment_count: environment_count(nonprod),
  nonprod_rpc_import_attachment_count:
    rpc_import_attachment_count(nonprod, 'DRGRD-AMS-LZ-RPC-CONNECTIVITY-KEY'),
  nonprod_rpc_policy_count: rpc_policy_count(nonprod),
}
