{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        data: {
          network: {
            vcn: '10.0.80.0/21',
            subnets: { app: '10.0.80.0/24' },
          },
        },
      },
    },
  },
}
