// Multi-OE shared ExaCS rejects raw environment names because they are ambiguous across OEs.
// error_contains: exacs project_db_compartments contains unknown or unqualified environments: prod
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'al',
      environments: { prod: { projects: { proj1: {} } } },
    },
    beta: {
      dns: 'be',
      environments: { prod: { projects: { proj1: {} } } },
    },
  },
  shared_platforms: {
    exacs: {
      network: { vcn: '10.2.16.0/21' },
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: { prod: ['proj1'] },
          notification_emails: {
            default: ['exacs-platform@example.com'],
            projects: ['exacs-projects@example.com'],
          },
        },
      },
    },
  },
}
