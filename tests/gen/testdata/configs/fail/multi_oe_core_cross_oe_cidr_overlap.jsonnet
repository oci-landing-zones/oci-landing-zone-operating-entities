// Cross-OE CIDR diagnostics identify both qualified environment scopes.
// error_contains: VCN CIDRs contains overlapping CIDRs
// error_contains: Environment alpha-prod shared project network (10.0.64.0/21) overlaps Environment beta-prod shared project network (10.0.64.0/21)
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'al',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
        },
      },
    },
    beta: {
      dns: 'be',
      environments: {
        prod: {
          shared_project_network: { network: { vcn: '10.0.64.0/21' } },
        },
      },
    },
  },
}
