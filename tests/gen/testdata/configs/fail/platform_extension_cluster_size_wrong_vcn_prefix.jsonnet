// OKE extension requires exact VCN prefix for selected cluster size
// error_contains: config_params.cluster_size small requires platform network.vcn prefix /20
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.16.0/21' },
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
