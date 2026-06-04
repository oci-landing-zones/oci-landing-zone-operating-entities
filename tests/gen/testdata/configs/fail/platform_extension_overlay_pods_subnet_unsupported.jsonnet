// OKE overlay subnet overrides must not include the native pod subnet
// error_contains: Platform oke.network.subnets for extension oke_simple has unsupported keys: pods. Allowed: int-lb, control-plane, workers
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: {
            vcn: '10.0.80.0/21',
            subnets: {
              'control-plane': '10.0.80.128/25',
              'int-lb': '10.0.80.0/25',
              workers: '10.0.81.0/23',
              pods: '10.0.83.0/23',
            },
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              cni_type: 'overlay',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
