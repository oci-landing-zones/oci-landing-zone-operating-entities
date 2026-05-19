// Plain platform subnets must fit inside platform VCN
// error_contains: Platform data.network.subnets must be contained by 10.0.80.0/24
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        data: {
          network: {
            vcn: '10.0.80.0/24',
            subnets: { app: '10.0.81.0/28' },
          },
        },
      },
    },
  },
}
