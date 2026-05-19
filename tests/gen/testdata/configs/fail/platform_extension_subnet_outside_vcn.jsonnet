// Extension platform subnets must fit inside platform VCN
// error_contains: Platform oke.network.subnets for extension oke_simple must be contained by 10.0.80.0/21
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: {
            vcn: '10.0.80.0/21',
            subnets: {
              'control-plane': '10.0.80.0/26',
              'int-lb': '10.0.81.0/24',
              pods: '10.0.84.0/22',
              workers: '10.0.88.0/23',
            },
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
