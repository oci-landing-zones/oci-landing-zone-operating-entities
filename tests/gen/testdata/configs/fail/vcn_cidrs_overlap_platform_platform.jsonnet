// Platform VCN CIDRs cannot overlap each other
// error_contains: VCN CIDRs contains overlapping CIDRs
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        data: {
          network: {
            vcn: '10.0.80.0/24',
            subnets: { app: '10.0.80.0/28' },
          },
        },
        analytics: {
          network: {
            vcn: '10.0.80.128/25',
            subnets: { app: '10.0.80.128/28' },
          },
        },
      },
    },
  },
}
