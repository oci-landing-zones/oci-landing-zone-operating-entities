// Dedicated subnets must fit inside their project VCN.
// error_contains: Environment prod.projects.api.subnets must be contained by 10.0.64.0/21
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: { network: { vcn: '10.0.64.0/21' } },
    projects: { api: { subnets: { jobs: '10.0.72.0/26' } } },
  } },
}
