// shared project network requires network block
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: {},
      projects: { proj1: {} },
    },
  },
}
