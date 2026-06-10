// OKE overlay pod CIDR must not overlap the Kubernetes service CIDR
// error_contains: config_params.pods_cidr for overlay must not overlap config_params.services_cidr
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              pods_cidr: '10.96.0.0/16',
              cni_type: 'overlay',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
