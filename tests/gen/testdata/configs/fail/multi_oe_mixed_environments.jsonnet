// Multi-OE mode rejects configs that also define root environments.
// error_contains: config must define either environments or operating_entities, not both
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
  operating_entities: {
    finance: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.128.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
}
