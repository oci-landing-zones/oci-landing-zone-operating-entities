// EXACS contributes shared/env platform IAM, project DB layers, observability, and product-specific cloud resource policies
// contains: CMP-LZ-SHARED-EXACS-KEY
// contains: CMP-LZ-PROD-EXACS-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACS-DB-KEY
// contains: GRP-LZ-GLOBAL-EXACS-DB-ADMIN-KEY
// contains: GRP-LZ-GLOBAL-EXACS-INFRA-ADMIN-KEY
// contains: PCY-LZ-GLOBAL-EXACS-INFRA-ADMIN-KEY
// contains: NOTT-LZ-EXACS-DB-WORKLOADS-KEY
// contains: NOTT-LZ-PROD-EXACS-PROJECTS-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: AL-LZ-EXACS-DB-CLUSTER-CPUUTIL-KEY
// contains: exacsinfrastructuremaintenance.begin
// contains: exacs-db@example.com
// contains: exacs-infra@example.com
// contains: exacs-projects@example.com
// contains: cloud-exadata-infrastructures
// contains: cloud-vmclusters
local lz = import 'gen/landing_zone.libsonnet';

local exacs_params(projects=[]) = {
  notification_emails: {
    default: ['exacs-platform@example.com'],
    db_workloads: ['exacs-db@example.com'],
    infra_workloads: ['exacs-infra@example.com'],
    projects: ['exacs-projects@example.com'],
  },
  project_db_compartments: projects,
};

local result = lz({
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
  },
  shared_platforms: {
    exacs: {
      network: { vcn: '10.0.24.0/21' },
      extension: {
        type: 'exacs',
        params: exacs_params({ prod: ['proj1'] }),
      },
    },
  },
});

std.manifestJsonEx({
  compartments: result.iam.compartments_configuration.compartments,
  groups: result.iam.identity_domain_groups_configuration.groups,
  policies: result.iam.policies_configuration.supplied_policies,
  observability_cis1: result.observability_cis1,
}, '  ')
