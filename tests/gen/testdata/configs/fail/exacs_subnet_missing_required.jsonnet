// EXACS network subnet overrides must include both db and backup subnets
// error_contains: Platform exacs.network.subnets for extension exacs missing required keys: backup
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: { projects: { proj1: {} } } },
  shared_platforms: {
    exacs: {
      network: {
        vcn: '10.0.24.0/21',
        subnets: {
          db: '10.0.24.0/24',
        },
      },
      extension: {
        type: 'exacs',
        params: {
          notification_emails: { default: ['exacs@example.com'] },
        },
      },
    },
  },
}
