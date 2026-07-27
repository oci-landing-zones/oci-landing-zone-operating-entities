// OKE public-LB capability must be an explicit boolean opt-in.
// error_contains: oke_simple config_params.public_load_balancer must be a boolean
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
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              public_load_balancer: 'true',
            },
          },
        },
      },
    },
  },
}
