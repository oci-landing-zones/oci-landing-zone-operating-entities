// OKE services CIDR cannot overlap the OKE VCN CIDR
// error_contains: config_params.services_cidr must not overlap platform VCN
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.0.80.0/24',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
