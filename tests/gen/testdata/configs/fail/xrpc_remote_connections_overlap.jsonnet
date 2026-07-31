// Distinct X-RPC entries must not claim the same remote routed CIDR.
// Accepting duplicate destinations would create ambiguous peer selection without an ECMP or failover contract.
// Generic CIDR tests cover local overlap; this is the only X-RPC-specific routing rejection retained.
// error_contains: Local and remote routed VCN CIDRs contains overlapping CIDRs
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_a',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    connectivity: {},
  },
  remote_peering_connections: {
    oe1_01: {
      remote_cidrs: ['10.1.0.0/21'],
    },
    oe1_02: {
      remote_cidrs: ['10.1.0.0/21'],
    },
  },
}
