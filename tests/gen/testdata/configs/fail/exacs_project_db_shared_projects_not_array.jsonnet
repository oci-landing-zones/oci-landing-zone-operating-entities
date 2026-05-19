// EXACS shared project DB compartment project lists must be arrays
// error_contains: exacs project_db_compartments.prod must be an array
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    exacs: {
      network: { vcn: '10.0.24.0/21' },
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
