// Multi-OE explicit dns must be two lowercase letters.
// error_contains: operating_entities.finance.dns must be exactly two lowercase letters
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    finance: {
      dns: 'f1',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
}
