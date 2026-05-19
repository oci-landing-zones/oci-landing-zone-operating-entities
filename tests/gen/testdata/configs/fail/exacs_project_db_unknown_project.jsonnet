// EXACS project DB compartments must reference projects from the target environment
// error_contains: exacs project_db_compartments must reference projects defined in the same environment: missing
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacs: {
          network: { vcn: '10.0.24.0/21' },
          extension: {
            type: 'exacs',
            params: {
              project_db_compartments: ['missing'],
              notification_emails: { default: ['exacs@example.com'] },
            },
          },
        },
      },
    },
  },
}
