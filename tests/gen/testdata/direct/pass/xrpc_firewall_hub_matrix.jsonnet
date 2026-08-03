// X-RPC preserves the common firewall routing contract for Hub A, Hub B, and Hub C while keeping IAM role-specific.
// contains: "failures": []
local lz = import 'gen/landing_zone.libsonnet';

local render(
  kind,
  region,
  short,
  local_cidrs,
  remote_cidr,
  peer_region,
  peer_id=null,
  peer_tenancy_ocid=null,
  requestor_group_ocid=null
      ) = lz({
  region: region,
  region_short_name: short,
  hub: { kind: kind, network: { vcn: local_cidrs.hub } },
  environments: {
    workload: {
      shared_project_network: { network: { vcn: local_cidrs.workload } },
    },
  },
  remote_peering_connections: {
    peer: {
      remote_cidrs: [remote_cidr],
      peer_id: peer_id,
      peer_region_name: peer_region,
      peer_tenancy_ocid: peer_tenancy_ocid,
      requestor_group_ocid: requestor_group_ocid,
    },
  },
});

local hub_b_acceptor = render(
  'hub_b',
  'eu-frankfurt-1',
  'fra',
  { hub: '10.0.0.0/21', workload: '10.0.64.0/21' },
  '10.1.0.0/16',
  'eu-amsterdam-1',
  peer_tenancy_ocid='ocid1.tenancy.oc1..requestor',
  requestor_group_ocid='ocid1.group.oc1..requestor-network-admin'
);
local hub_a_requestor = render(
  'hub_a',
  'eu-amsterdam-1',
  'ams',
  { hub: '10.1.0.0/21', workload: '10.1.64.0/21' },
  '10.0.0.0/16',
  'eu-frankfurt-1',
  peer_id='RPC-FRA-LZ-HUB-PEER-KEY',
  peer_tenancy_ocid='ocid1.tenancy.oc1..acceptor'
);
local hub_c_requestor = render(
  'hub_c',
  'eu-zurich-1',
  'zrh',
  { hub: '10.2.0.0/21', workload: '10.2.64.0/21' },
  '10.3.0.0/16',
  'eu-marseille-1',
  peer_id='RPC-MRS-LZ-HUB-PEER-KEY'
);

local shared(result) =
  result.network.network_configuration.network_configuration_categories['0-shared'];
local hub_vcn(result, region) = shared(result).vcns['VCN-%s-LZ-HUB-KEY' % region];
local drg(result, region) =
  shared(result).non_vcn_specific_gateways.dynamic_routing_gateways[
    'DRG-%s-LZ-HUB-KEY' % region
  ];
local remote_routes(result, region, remote_cidr) = std.flattenArrays([
  [
    hub_vcn(result, region).route_tables[route_table_key].route_rules[rule_key]
    for rule_key in std.objectFields(
      hub_vcn(result, region).route_tables[route_table_key].route_rules
    )
    if hub_vcn(result, region).route_tables[route_table_key]
       .route_rules[rule_key].destination == remote_cidr
  ]
  for route_table_key in std.objectFields(hub_vcn(result, region).route_tables)
]);
local firewall_hub_checks(result, region, remote_cidr) =
  local hub_drg = drg(result, region);
  local routes = remote_routes(result, region, remote_cidr);
  local rpc_route_table = hub_drg.drg_route_tables[
    'DRGRT-%s-LZ-RPC-PEER-KEY' % region
  ];
  local rpc_import = hub_drg.drg_route_distributions[
    'DRGRD-%s-LZ-HUB-KEY' % region
  ].statements['ROUTE-TO-RPC-LZ-PEER-KEY'];
  [
    {
      name: '%s RPC route table does not use the common firewall-hub path' % region,
      ok: rpc_route_table.route_rules[
        'DRGRT-%s-LZ-RPC-PEER-STATIC-ROUTE' % region
      ] == {
        destination: '0.0.0.0/0',
        destination_type: 'CIDR_BLOCK',
        next_hop_drg_attachment_key: 'DRGATT-%s-LZ-HUB-VCN-KEY' % region,
      },
    },
    {
      name: '%s RPC attachment is not imported into the hub distribution' % region,
      ok: rpc_import.match_criteria.attachment_type
          == 'REMOTE_PEERING_CONNECTION'
          && rpc_import.match_criteria.drg_attachment_key
             == 'DRGATT-%s-LZ-HUB-RPC-PEER-KEY' % region,
    },
    {
      name: '%s hub has no RPC route through its DRG' % region,
      ok: std.length([
        route
        for route in routes
        if std.objectHas(route, 'network_entity_key')
           && route.network_entity_key == 'DRG-%s-LZ-HUB-KEY' % region
      ]) > 0,
    },
    {
      name: '%s hub has no RPC route through its firewall or trust NLB' % region,
      ok: std.length([
        route
        for route in routes
        if std.objectHas(route, 'network_entity_id')
      ]) > 0,
    },
  ];

local acceptor_statements = hub_b_acceptor.iam.policies_configuration
                            .supplied_policies['PCY-FRA-LZ-HUB-RPC-PEER-KEY'].statements;
local requestor_statements = hub_a_requestor.iam.policies_configuration
                             .supplied_policies['PCY-AMS-LZ-HUB-RPC-PEER-KEY'].statements;
local checks =
  firewall_hub_checks(hub_b_acceptor, 'FRA', '10.1.0.0/16')
  + firewall_hub_checks(hub_a_requestor, 'AMS', '10.0.0.0/16')
  + firewall_hub_checks(hub_c_requestor, 'ZRH', '10.3.0.0/16')
  + [
    {
      name: 'Hub B acceptor IAM does not identify the foreign requestor group',
      ok: acceptor_statements == [
        'Define group requestorGroup as ocid1.group.oc1..requestor-network-admin',
        'Define tenancy Requestor as ocid1.tenancy.oc1..requestor',
        'Admit group requestorGroup of tenancy Requestor to manage remote-peering-to in compartment cmp-landingzone:cmp-lz-network',
      ],
    },
    {
      name: 'Hub A requestor IAM does not use the local identity-domain group',
      ok: requestor_statements == [
        'Define tenancy Acceptor as ocid1.tenancy.oc1..acceptor',
        "Allow group 'id_lz_common'/'grp-lz-network-admin' to manage remote-peering-from in compartment cmp-landingzone:cmp-lz-network",
        "Endorse group 'id_lz_common'/'grp-lz-network-admin' to manage remote-peering-to in tenancy Acceptor",
      ],
    },
  ];

{
  failures: [check.name for check in checks if !check.ok],
}
