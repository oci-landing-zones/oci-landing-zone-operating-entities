// xrpc config renders requester/acceptor RPC objects, routing, and cross-tenancy IAM
// contains: "acceptor_has_peer_id": false
// contains: "acceptor_has_peer_key": false
// contains: "requester_peer_key": "RPC-FRA-LZ-HUB-REGION-A-KEY"
// contains: "requester_peer_id": "ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.example"
// contains: "hub_e_remote_route_target": "DRG-FRA-LZ-HUB-KEY"
// contains: "hub_a_remote_route_entity_id": "Internal OCI NFW PRIVATE IP OCID
// contains: "hub_b_remote_route_entity_id": "OCI NFW PRIVATE IP OCID
// contains: "hub_c_remote_route_entity_id": "TRUST NLB PRIVATE IP OCID
// contains: "rpc_attachment_type": "REMOTE_PEERING_CONNECTION"
// contains: "rpc_route_destination": "10.1.0.0/16"
// contains: Admit group requestorGroup of tenancy Requestor to manage remote-peering-to
// contains: Allow group requestorGroup to manage remote-peering-from
// contains: Endorse group requestorGroup to manage remote-peering-to
local lz = import 'gen/landing_zone.libsonnet';

local base_config(hub_kind, rpc) = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: hub_kind,
    network: {
      vcn: '10.0.0.0/21',
      remote_peering_connections: rpc,
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
};

local acceptor = lz(base_config('hub_e', {
  region_b: {
    remote_cidrs: ['10.1.0.0/16'],
    peer_region_name: 'eu-amsterdam-1',
  },
}));
local requester_key = lz(base_config('hub_e', {
  region_a: {
    remote_cidrs: ['10.1.0.0/16'],
    peer_id: 'RPC-FRA-LZ-HUB-REGION-A-KEY',
  },
}));
local requester_ocid = lz(base_config('hub_e', {
  region_a: {
    remote_cidrs: ['10.1.0.0/16'],
    peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.example',
  },
}));
local cross_acceptor = lz(base_config('hub_a', {
  tenancy2: {
    remote_cidrs: ['10.1.0.0/16'],
    peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
    requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
  },
}));
local cross_requester = lz(base_config('hub_e', {
  tenancy1: {
    remote_cidrs: ['10.1.0.0/16'],
    peer_id: 'RPC-FRA-LZ-HUB-TENANCY1-KEY',
    peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
    requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
  },
}));
local hub_b = lz(base_config('hub_b', {
  tenancy2: { remote_cidrs: ['10.1.0.0/16'] },
}));
local hub_c = lz(base_config('hub_c', {
  tenancy2: { remote_cidrs: ['10.1.0.0/16'] },
}));

local acceptor_rpc =
  acceptor.network.network_configuration.network_configuration_categories['0-shared']
    .non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY']
    .remote_peering_connections['RPC-FRA-LZ-HUB-REGION-B-KEY'];
local requester_key_rpc =
  requester_key.network.network_configuration.network_configuration_categories['0-shared']
    .non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY']
    .remote_peering_connections['RPC-FRA-LZ-HUB-REGION-A-KEY'];
local requester_ocid_rpc =
  requester_ocid.network.network_configuration.network_configuration_categories['0-shared']
    .non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY']
    .remote_peering_connections['RPC-FRA-LZ-HUB-REGION-A-KEY'];
local hub_e_spoke_route =
  requester_key.network.network_configuration.network_configuration_categories['1-prod']
    .vcns['VCN-FRA-LZ-PROD-PROJECTS-KEY']
    .route_tables['RT-FRA-LZ-PROD-PROJ-GENERIC-KEY']
    .route_rules['rr-fra-rpc-region-a-1'];
local hub_a_post_route =
  cross_acceptor.network.network_configuration.network_configuration_categories['0-shared']
    .vcns['VCN-FRA-LZ-HUB-KEY']
    .route_tables['RT-FRA-LZ-HUB-INGRESS-KEY']
    .route_rules['rr-fra-rpc-tenancy2-1'];
local hub_b_post_route =
  hub_b.network.network_configuration.network_configuration_categories['0-shared']
    .vcns['VCN-FRA-LZ-HUB-KEY']
    .route_tables['RT-FRA-LZ-HUB-INGRESS-KEY']
    .route_rules['rr-fra-rpc-tenancy2-1'];
local hub_c_post_route =
  hub_c.network.network_configuration.network_configuration_categories['0-shared']
    .vcns['VCN-FRA-LZ-HUB-KEY']
    .route_tables['RT-FRA-LZ-HUB-INGRESS-KEY']
    .route_rules['rr-fra-rpc-tenancy2-1'];
local rpc_attachment =
  requester_key.network.network_configuration.network_configuration_categories['0-shared']
    .non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY']
    .drg_attachments['DRGATT-FRA-LZ-HUB-RPC-REGION-A-KEY'];
local cross_acceptor_statements =
  cross_acceptor.iam.policies_configuration.supplied_policies['PCY-FRA-LZ-HUB-RPC-TENANCY2-KEY'].statements;
local cross_requester_statements =
  cross_requester.iam.policies_configuration.supplied_policies['PCY-FRA-LZ-HUB-RPC-TENANCY1-KEY'].statements;

{
  acceptor_has_peer_id: std.objectHas(acceptor_rpc, 'peer_id'),
  acceptor_has_peer_key: std.objectHas(acceptor_rpc, 'peer_key'),
  requester_peer_key: requester_key_rpc.peer_key,
  requester_peer_id: requester_ocid_rpc.peer_id,
  hub_e_remote_route_target: hub_e_spoke_route.network_entity_key,
  hub_a_remote_route_entity_id: hub_a_post_route.network_entity_id,
  hub_b_remote_route_entity_id: hub_b_post_route.network_entity_id,
  hub_c_remote_route_entity_id: hub_c_post_route.network_entity_id,
  rpc_attachment_type: rpc_attachment.network_details.type,
  rpc_route_destination: hub_e_spoke_route.destination,
  cross_acceptor_statements: cross_acceptor_statements,
  cross_requester_statements: cross_requester_statements,
}
