// An acceptor cannot authorize a foreign group without identifying its tenancy.
// error_contains: config.remote_peering_connections.peer.peer_tenancy_ocid is required when requestor_group_ocid is provided
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      requestor_group_ocid: 'ocid1.group.oc1..requestor-network-admin',
    },
  },
}
