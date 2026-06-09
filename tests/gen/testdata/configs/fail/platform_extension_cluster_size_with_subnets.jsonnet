// OKE extension does not allow manual subnet maps with cluster size profiles
// error_contains: config_params.cluster_size cannot be used together with platform network.subnets
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: {
            vcn: '10.0.16.0/20',
            subnets: {
              'control-plane': '10.0.16.0/25',
              'int-lb': '10.0.16.128/25',
              workers: '10.0.18.0/23',
              pods: '10.0.20.0/23',
            },
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              cluster_size: 'small',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
