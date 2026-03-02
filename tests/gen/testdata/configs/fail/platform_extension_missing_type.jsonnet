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
              kubernetes_version: 'v1.31.1',
              services_cidr: '10.96.0.0/16',
              pods_cidr: '10.244.0.0/16',
            },
          },
        },
      },
    },
  },
}
