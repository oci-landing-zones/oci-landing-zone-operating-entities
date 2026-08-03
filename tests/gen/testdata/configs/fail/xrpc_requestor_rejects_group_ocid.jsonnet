// A requestor policy must use its local identity-domain group rather than a supplied group OCID.
// error_contains: config.remote_peering_connections.peer.requestor_group_ocid is only valid on the acceptor, where peer_id is omitted
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_id: 'RPC-AMS-LZ-HUB-KEY',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
      requestor_group_ocid: 'ocid1.group.oc1..local-group-must-not-be-supplied',
    },
  },
}
