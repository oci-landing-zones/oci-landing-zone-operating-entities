// Shared subnet names that differ only by key casing must not overwrite each other.
// error_contains: Environment prod subnet definitions generate duplicate resource key SN-FRA-LZ-PROD-API-KEY: project_network.network.subnets.API, project_network.network.subnets.api
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: {
      network: {
        vcn: '10.0.64.0/21',
        subnets: {
          API: '10.0.64.0/24',
          api: '10.0.65.0/24',
        },
      },
    },
  } },
}
