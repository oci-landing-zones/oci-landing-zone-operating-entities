// A remote X-RPC destination must not overlap the local hub or any generated local VCN.
// error_contains: Hub VCN (10.0.0.0/21) overlaps Remote peering connection peer CIDR 1 (10.0.0.0/21)
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  remote_peering_connections: {
    peer: { remote_cidrs: ['10.0.0.0/21'] },
  },
}
