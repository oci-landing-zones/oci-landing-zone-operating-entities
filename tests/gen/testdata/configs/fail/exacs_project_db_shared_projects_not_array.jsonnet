// EXACS shared project DB compartment project lists must be arrays
// error_contains: exacs project_db_compartments.prod must be an array
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    exacs: {
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: { prod: 'proj1' },
          notification_emails: { default: ['exacs@example.com'] },
        },
      },
    },
  },
}
