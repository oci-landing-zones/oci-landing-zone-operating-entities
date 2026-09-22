// X-RPC routes accept only canonical IPv4 CIDRs.
// error_contains: config.remote_peering_connections.peer.remote_cidrs[0] must be a canonical IPv4 CIDR
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: { remote_cidrs: ['10.1.1.0/21'] },
  },
}
