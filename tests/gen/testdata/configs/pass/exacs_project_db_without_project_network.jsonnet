// EXACS Autonomous project DB tiers can exist without a project/spoke network
// contains: CMP-LZ-PROD-PROJ1-EXACS-DB-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
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
          project_db_compartments: { prod: ['proj1'] },
          notification_emails: {
            default: ['exacs-platform@example.com'],
            db_workloads: ['exacs-db@example.com'],
            infra_workloads: ['exacs-infra@example.com'],
            projects: ['exacs-projects@example.com'],
          },
        },
      },
    },
  },
}
