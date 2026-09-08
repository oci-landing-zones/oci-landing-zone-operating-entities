// A declared dedicated-subnet map must contain at least one subnet.
// error_contains: Environment prod.projects.api.subnets must contain at least one subnet
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: { network: { vcn: '10.0.64.0/21' } },
    projects: { api: { subnets: {} } },
  } },
}
