// Multi-OE mode rejects an OE with no environments even when another OE is valid.
// error_contains: operating_entities.retail_bank.environments must have at least one environment
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    finance: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
    retail_bank: {
      environments: {},
    },
  },
}
