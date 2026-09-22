// Manual subnet maps must include the FSS subnet when FSS support is enabled.
// error_contains: Platform oke.network.subnets for extension oke_simple missing required keys: fss
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: {
            vcn: '10.0.80.0/20',
            subnets: {
              'control-plane': '10.0.90.128/29',
              'int-lb': '10.0.90.64/26',
              workers: '10.0.88.0/23',
              pods: '10.0.80.0/21',
            },
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              create_fss: true,
            },
          },
        },
      },
    },
  },
}
