// The acceptor's foreign requestor identity must be a group OCID.
// error_contains: config.remote_peering_connections.peer.requestor_group_ocid must start with ocid1.group
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..requestor',
      requestor_group_ocid: 'ocid1.user.oc1..not-a-group',
    },
  },
}
