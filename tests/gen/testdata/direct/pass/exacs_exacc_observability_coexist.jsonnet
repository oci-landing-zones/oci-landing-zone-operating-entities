// EXACC and EXACS observability keys coexist when both products are configured in the same environment
// contains: RUL-LZ-PROD-NOTIFICATION-PROJECTS-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: AL-LZ-DB-CLUSTER-CPUUTIL-KEY
// contains: AL-LZ-EXACS-DB-CLUSTER-CPUUTIL-KEY
// contains: RUL-LZ-NOTIFICATION-OPERATOR-ACCESS-CONTROL-KEY
// contains: RUL-LZ-NOTIFICATION-EXACS-OPERATOR-ACCESS-CONTROL-KEY
// contains: CMP-LZ-PROD-PROJ1-DB-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACS-DB-KEY
local lz = import 'gen/landing_zone.libsonnet';

local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacc: {
          extension: {
            type: 'exacc',
            params: {
              project_db_compartments: ['proj1'],
              notification_emails: {
                default: ['exacc-platform@example.com'],
                projects: ['exacc-projects@example.com'],
              },
            },
          },
        },
        exacs: {
          extension: {
            type: 'exacs',
            params: {
              project_db_compartments: ['proj1'],
              notification_emails: {
                default: ['exacs-platform@example.com'],
                projects: ['exacs-projects@example.com'],
              },
            },
          },
        },
      },
    },
  },
  shared_platforms: {
    exacc: {
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
    },
    exacs: {
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: { prod: ['proj1'] },
          notification_emails: {
            default: ['exacs-platform@example.com'],
            db_workloads: ['exacs-db@example.com'],
            infra_workloads: ['exacs-infra@example.com'],
          },
        },
      },
    },
  },
});

std.manifestJsonEx({
  event_rule_keys: std.objectFields(result.observability_cis1.events_configuration.event_rules),
  alarm_keys: std.objectFields(result.observability_cis1.alarms_configuration.alarms),
  topic_keys: std.objectFields(result.observability_cis1.notifications_configuration.topics),
  project_db_keys: std.objectFields(
    result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY']
    .children['CMP-LZ-PROD-KEY']
    .children['CMP-LZ-PROD-PROJECTS-KEY']
    .children['CMP-LZ-PROD-PROJ1-KEY']
    .children
  ),
}, '  ')
