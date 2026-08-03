// Every X-RPC edge must explicitly declare the reviewed remote routable CIDRs.
// error_contains: config.remote_peering_connections.peer.remote_cidrs is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: { peer_region_name: 'eu-amsterdam-1' },
  },
}
