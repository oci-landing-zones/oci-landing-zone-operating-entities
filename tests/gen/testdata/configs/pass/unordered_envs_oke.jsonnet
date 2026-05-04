// intentionally unordered environments prove semantic ordering during render
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    qa: {
      shared_project_network: { network: { vcn: '10.0.104.0/21' } },
      projects: { proj1: {} },
    },
    dev: {
      shared_project_network: { network: { vcn: '10.0.96.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.88.0/21' } },
      projects: { proj1: {} },
    },
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
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
