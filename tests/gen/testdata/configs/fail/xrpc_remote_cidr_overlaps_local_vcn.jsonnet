// RPC remote CIDRs cannot overlap any local hub, environment, or platform VCN.
// error_contains: Local and remote routed VCN CIDRs contains overlapping CIDRs
// error_contains: Hub VCN (10.0.0.0/21) overlaps Remote peering connection region_b CIDR 1 (10.0.0.0/21)
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  remote_peering_connections: {
    region_b: {
      remote_cidrs: ['10.0.0.0/21'],
      peer_region_name: 'eu-amsterdam-1',
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
