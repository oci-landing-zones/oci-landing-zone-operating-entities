// A requestor peer reference must be an RPC OCID or a dependency key, never another OCI resource OCID.
// error_contains: config.remote_peering_connections.peer.peer_id must reference a remote peering connection OCID or dependency key
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_id: 'ocid1.tenancy.oc1..wrong-resource-type',
    },
  },
}
