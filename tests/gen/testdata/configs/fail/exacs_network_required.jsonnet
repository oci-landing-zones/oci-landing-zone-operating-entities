// EXACS Autonomous project DB tiers imply AVMC placement, so the platform must declare a network
// error_contains: exacs project_db_compartments require an ExaCS platform network for AVMC placement
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
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: { prod: ['proj1'] },
          notification_emails: { default: ['exacs@example.com'] },
        },
      },
    },
  },
}
