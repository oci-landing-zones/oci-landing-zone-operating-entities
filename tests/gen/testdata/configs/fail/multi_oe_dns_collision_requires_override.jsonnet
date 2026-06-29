// Multi-OE DNS generation fails when no unique two-letter label can be produced.
// error_contains: operating_entities.a_a.dns could not be generated uniquely; set operating_entities.a_a.dns explicitly
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    aa: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
    a_a: {
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.128.0/21' } },
          projects: { proj1: {} },
        },
      },
    },
  },
}
