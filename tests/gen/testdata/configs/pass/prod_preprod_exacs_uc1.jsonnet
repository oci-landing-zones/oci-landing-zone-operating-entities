// config-mode EXACS use case 1 renders shared EXACS network plus identity-only environment EXACS platforms
// contains: CMP-LZ-SHARED-EXACS-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACS-DB-KEY
// contains: VCN-FRA-LZ-SHARED-PLATFORM-EXACS-KEY
// contains: shared-platform-exacs
// contains: exacs-db@example.com
local exacs_params(projects) = {
  project_db_compartments: projects,
  notification_emails: {
    default: ['exacs-platform@example.com'],
    db_workloads: ['exacs-db@example.com'],
    infra_workloads: ['exacs-infra@example.com'],
    projects: ['exacs-projects@example.com'],
  },
};

{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacs: {
          extension: { type: 'exacs', params: exacs_params(['proj1']) },
        },
      },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacs: {
          extension: { type: 'exacs', params: exacs_params(['proj1']) },
        },
      },
    },
  },
  shared_platforms: {
    exacs: {
      network: { vcn: '10.0.24.0/21' },
      extension: {
        type: 'exacs',
        params: exacs_params({
          prod: ['proj1'],
          preprod: ['proj1'],
        }),
      },
    },
  },
}
