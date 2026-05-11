// EXACS shared project DB compartments must reference defined environments
// error_contains: exacs project_db_compartments must reference defined environments: missing
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    exacs: {
      network: { vcn: '10.0.24.0/21' },
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: { missing: ['proj1'] },
          notification_emails: { default: ['exacs@example.com'] },
        },
      },
    },
  },
}
