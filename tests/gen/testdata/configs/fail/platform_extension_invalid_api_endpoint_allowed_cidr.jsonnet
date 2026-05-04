// OKE kube API endpoint allowed CIDRs must be canonical IPv4 CIDRs
// error_contains: config_params.api_endpoint_allowed_cidrs[0] must be a canonical IPv4 CIDR
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
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.1/24'],
            },
          },
        },
      },
    },
  },
}
