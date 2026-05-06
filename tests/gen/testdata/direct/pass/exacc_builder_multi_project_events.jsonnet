// ExaCC project DB notifications emit one event rule per project DB compartment when multiple projects are configured
// contains: RUL-LZ-PROD-NOTIFICATION-PROJECTS-PROJ1-KEY
// contains: RUL-LZ-PROD-NOTIFICATION-PROJECTS-PROJ2-KEY
// contains: CMP-LZ-PROD-PROJ1-DB-KEY
// contains: CMP-LZ-PROD-PROJ2-DB-KEY
local lz = import 'gen/landing_zone.libsonnet';

local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {}, proj2: {} },
      platforms: {
        exacc: {
          extension: {
            type: 'exacc',
            params: {
              project_db_compartments: ['proj1', 'proj2'],
              notification_emails: {
                default: ['exacc-platform@example.com'],
                projects: ['exacc-projects@example.com'],
              },
            },
          },
        },
      },
    },
  },
});

std.manifestJsonEx(result.observability_cis1.events_configuration.event_rules, '  ')
