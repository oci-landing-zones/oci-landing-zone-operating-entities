// A present project_network must contain its required network block.
// error_contains: Environment prod.project_network.network is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: {},
      projects: { proj1: {} },
    },
  },
}
