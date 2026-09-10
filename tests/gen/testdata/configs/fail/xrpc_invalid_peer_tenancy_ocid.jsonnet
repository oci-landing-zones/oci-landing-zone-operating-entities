// Cross-tenancy peer identity must be a tenancy OCID rather than an arbitrary resource OCID.
// error_contains: config.remote_peering_connections.peer.peer_tenancy_ocid must start with ocid1.tenancy
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_id: 'RPC-AMS-LZ-HUB-KEY',
      peer_tenancy_ocid: 'ocid1.group.oc1..not-a-tenancy',
    },
  },
}
