// Platform VCN CIDR must be canonical IPv4 CIDR
// error_contains: Platform data.network.vcn must be a canonical IPv4 CIDR
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        data: {
          network: {
            vcn: '10.0.80.1/24',
            subnets: { app: '10.0.80.0/28' },
          },
        },
      },
    },
  },
}
