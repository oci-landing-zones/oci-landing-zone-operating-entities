// EXACS project DB compartments must reference projects from the target environment
// error_contains: exacs project_db_compartments must reference projects defined in the same environment: missing
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      projects: { proj1: {} },
      platforms: {
        exacs: {
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
