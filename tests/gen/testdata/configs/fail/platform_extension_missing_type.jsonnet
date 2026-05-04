// platform extension requires type
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
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
