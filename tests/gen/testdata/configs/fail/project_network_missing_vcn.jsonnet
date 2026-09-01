// A project network block must contain its required VCN CIDR.
// error_contains: Environment prod.project_network.network.vcn is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: { network: {} },
      projects: { proj1: {} },
    },
  },
}
