// Spoke and platform VCN CIDRs cannot overlap
// error_contains: VCN CIDRs contains overlapping CIDRs
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      platforms: {
        data: {
          network: {
            vcn: '10.0.64.0/24',
            subnets: { app: '10.0.64.0/28' },
          },
        },
      },
    },
  },
}
