// The public config uses peer_id for both RPC OCIDs and dependency keys; peer_key is an output-only field.
// error_contains: config.remote_peering_connections.peer contains unsupported keys: peer_key
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/21'],
      peer_key: 'RPC-AMS-LZ-HUB-KEY',
    },
  },
}
