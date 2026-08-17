// Shared and dedicated subnet names must not collapse to the same generated resource key.
// error_contains: Environment prod subnet definitions generate duplicate resource key SN-FRA-LZ-PROD-API-JOBS-KEY: project_network.network.subnets.api-jobs, projects.api.subnets.jobs
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: {
      network: {
        vcn: '10.0.64.0/21',
        subnets: { 'api-jobs': '10.0.64.0/24' },
      },
    },
    projects: { api: { subnets: { jobs: '10.0.65.0/24' } } },
  } },
}
