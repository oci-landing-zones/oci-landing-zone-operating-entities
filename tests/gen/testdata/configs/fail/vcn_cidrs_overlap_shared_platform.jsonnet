// Shared platform VCN CIDRs cannot overlap other VCN CIDRs
// error_contains: VCN CIDRs contains overlapping CIDRs
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  shared_platforms: {
    data: {
      network: {
        vcn: '10.0.64.0/24',
        subnets: { app: '10.0.64.0/28' },
      },
    },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
