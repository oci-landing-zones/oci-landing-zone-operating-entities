// config-mode ExaCC use case 1 renders common landing-zone files with ExaCC IAM and observability merged in
// contains: CMP-LZ-SHARED-EXACC-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACC-DB-KEY
// contains: cmp-lz-prod-proj1-exacc-db
// contains: RUL-LZ-NOTIFICATION-PLATFORM-EXACC-DB-KEY
// contains: exacc-db@example.com
local env_exacc_platform(projects=[]) = {
  extension: {
    type: 'exacc',
    params: {
      project_db_compartments: projects,
      notification_emails: {
        default: ['exacc-platform@example.com'],
        projects: ['exacc-projects@example.com'],
      },
    },
  },
};

local shared_exacc_platform = {
  extension: {
    type: 'exacc',
    params: {
      notification_emails: {
        default: ['exacc-platform@example.com'],
        db_workloads: ['exacc-db@example.com'],
        infra_workloads: ['exacc-infra@example.com'],
      },
    },
  },
};

{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: { exacc: env_exacc_platform(['proj1']) },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: { exacc: env_exacc_platform(['proj1']) },
    },
  },
  shared_platforms: {
    exacc: shared_exacc_platform,
  },
}
