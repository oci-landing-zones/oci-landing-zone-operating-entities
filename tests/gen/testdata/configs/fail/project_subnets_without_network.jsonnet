// Dedicated subnets cannot exist without their environment project VCN.
// error_contains: Environment prod.projects.api.subnets requires project_network
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: { projects: { api: { subnets: { app: '10.0.64.0/26' } } } } },
}
