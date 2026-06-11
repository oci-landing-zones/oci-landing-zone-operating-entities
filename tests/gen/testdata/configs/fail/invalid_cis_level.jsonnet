// invalid cis_level values fail at the config normalization boundary
// error_contains: config.cis_level must be 1 or 2
{
  cis_level: 3,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
}
