// EXACC multi-stack shared platforms accept environment-mapped project DB compartments for Autonomous ADB-D tiers
// contains: CMP-LZ-PROD-PROJ1-EXACC-DB-KEY
// contains: RUL-LZ-PROD-NOTIFICATION-PROJECTS-KEY
// contains: NOTT-LZ-PROD-EXACC-PROJECTS-KEY
// contains: nott-lz-prod-exacc-projects
local published = import 'gen/workload-extensions/exacc/multi-stack/published.libsonnet';

local result = published.render({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          project_db_compartments: { prod: ['proj1'] },
          notification_emails: {
            default: ['exacc-platform@example.com'],
            db_workloads: ['exacc-db@example.com'],
            infra_workloads: ['exacc-infra@example.com'],
            projects: ['exacc-projects@example.com'],
          },
        },
      },
    },
  },
});

std.manifestJsonEx({
  compartments: result.identity.compartments_configuration.compartments,
  event_rules: result.observability.events_configuration.event_rules,
  topics: result.observability.notifications_configuration.topics,
}, '  ')
