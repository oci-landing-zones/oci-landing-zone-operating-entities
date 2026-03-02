{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: null,
      projects: { proj1: {} },
    },
  },
}
