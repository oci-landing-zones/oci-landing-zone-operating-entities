// Dedicated subnet paths must remain unique after their segments are joined into a resource key.
// error_contains: Environment prod subnet definitions generate duplicate resource key SN-FRA-LZ-PROD-API-JOBS-X-KEY: projects.api.subnets.jobs-x, projects.api-jobs.subnets.x
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: { network: { vcn: '10.0.64.0/21', subnets: {} } },
    projects: {
      api: { subnets: { 'jobs-x': '10.0.64.0/24' } },
      'api-jobs': { subnets: { x: '10.0.65.0/24' } },
    },
  } },
}
