// A cross-tenancy acceptor needs the foreign requestor group OCID for its Admit policy.
// error_contains: config.remote_peering_connections.peer.requestor_group_ocid is required for a cross-tenancy acceptor
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
    },
  },
}
