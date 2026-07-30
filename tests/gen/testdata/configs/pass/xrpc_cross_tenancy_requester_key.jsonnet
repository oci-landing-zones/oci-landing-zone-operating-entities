// config mode renders a cross-tenancy requester RPC using a dependency key
// contains: "peer_key": "RPC-FRA-LZ-HUB-TENANCY1-KEY"
// contains: Define tenancy Acceptor as ocid1.tenancy.oc1..acceptor
// contains: Endorse group requestorGroup to manage remote-peering-to in tenancy Acceptor
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.1.0.0/21',
    },
  },
  remote_peering_connections: {
    tenancy1: {
      peer_id: 'RPC-FRA-LZ-HUB-TENANCY1-KEY',
      remote_cidrs: ['10.0.0.0/16'],
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
      requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.1.64.0/21' } },
    },
  },
}
