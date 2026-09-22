// Dedicated and shared subnets in one project VCN must not overlap.
// error_contains: Environment prod project network subnets contains overlapping CIDRs
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: {
      network: {
        vcn: '10.0.64.0/21',
        subnets: { shared_app: '10.0.64.0/24' },
      },
    },
    projects: { api: { subnets: { app: '10.0.64.0/25' } } },
  } },
}
