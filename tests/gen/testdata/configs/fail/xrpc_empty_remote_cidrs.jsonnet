// An X-RPC edge with no remote CIDR cannot produce a useful or reviewable route surface.
// error_contains: config.remote_peering_connections.peer.remote_cidrs must contain at least one value
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: { remote_cidrs: [] },
  },
}
