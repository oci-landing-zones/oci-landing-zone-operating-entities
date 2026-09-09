// EXACC and EXACS observability keys coexist when both products are configured in the same environment
// contains: RUL-LZ-PROD-NOTIFICATION-PROJECTS-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: AL-LZ-DB-CLUSTER-CPUUTIL-KEY
// contains: AL-LZ-EXACS-DB-CLUSTER-CPUUTIL-KEY
// contains: RUL-LZ-NOTIFICATION-OPERATOR-ACCESS-CONTROL-KEY
// contains: RUL-LZ-NOTIFICATION-EXACS-OPERATOR-ACCESS-CONTROL-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACC-DB-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACS-DB-KEY
// contains: com.oraclecloud.databaseservice.exaccinfrastructuremaintenance.begin
// contains: com.oraclecloud.databaseservice.deletevmcluster.begin
// contains: com.oraclecloud.databaseservice.cloudexadatainfrastructuremaintenance.begin
// contains: com.oraclecloud.databaseservice.deletecloudvmcluster.begin
// contains: com.oraclecloud.databaseservice.autonomous.autonomouscloudvmcluster.update.begin
// contains: "exacc_catalog_excludes_cloud_events": true
// contains: "exacs_catalog_excludes_cloud_at_customer_events": true
local lz = import 'gen/landing_zone.libsonnet';
local events = import 'gen/workload-extensions/exadb/events.libsonnet';
local products = import 'gen/workload-extensions/exadb/products.libsonnet';

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
          network: { vcn: '10.0.24.0/21' },
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
      network: { vcn: '10.0.32.0/21' },
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

local exacc_catalog = events.catalog(products.exacc);
local exacs_catalog = events.catalog(products.exacs);
local contains_event(catalog, event_type) = std.member(catalog.infra + catalog.vmc, event_type);

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
  exacc_product_events: exacc_catalog.infra + exacc_catalog.vmc,
  exacs_product_events: exacs_catalog.infra + exacs_catalog.vmc,
  exacc_catalog_excludes_cloud_events:
    !contains_event(
      exacc_catalog,
      'com.oraclecloud.databaseservice.deletecloudvmcluster.begin'
    ),
  exacs_catalog_excludes_cloud_at_customer_events:
    !contains_event(
      exacs_catalog,
      'com.oraclecloud.databaseservice.deletevmcluster.begin'
    ),
}, '  ')
