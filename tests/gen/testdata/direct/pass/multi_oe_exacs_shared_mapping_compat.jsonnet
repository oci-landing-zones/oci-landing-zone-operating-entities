// Shared ExaCS maps qualified project tiers into identically named projects under both OE environment roots.
// contains: "alpha_project_db": "CMP-LZ-ALPHA-PROD-PROJ1-EXACS-DB-KEY"
// contains: "beta_project_db": "CMP-LZ-BETA-PROD-PROJ1-EXACS-DB-KEY"
// contains: "shared_vcn": "VCN-FRA-LZ-SHARED-PLATFORM-EXACS-KEY"
local landing_zone = import 'gen/landing_zone.libsonnet';

local result = landing_zone({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: { prod: { projects: { proj1: {} } } },
    },
    beta: {
      display_name: 'Beta',
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
          project_db_compartments: {
            'alpha-prod': ['proj1'],
            'beta-prod': ['proj1'],
          },
          notification_emails: {
            default: ['exacs-platform@example.com'],
            projects: ['exacs-projects@example.com'],
          },
        },
      },
    },
  },
});

local root = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local alpha_project = root['CMP-LZ-ALPHA-KEY'].children['CMP-LZ-ALPHA-PROD-KEY']
  .children['CMP-LZ-ALPHA-PROD-PROJECTS-KEY'].children['CMP-LZ-ALPHA-PROD-PROJ1-KEY'];
local beta_project = root['CMP-LZ-BETA-KEY'].children['CMP-LZ-BETA-PROD-KEY']
  .children['CMP-LZ-BETA-PROD-PROJECTS-KEY'].children['CMP-LZ-BETA-PROD-PROJ1-KEY'];
local alpha_project_db = 'CMP-LZ-ALPHA-PROD-PROJ1-EXACS-DB-KEY';
local beta_project_db = 'CMP-LZ-BETA-PROD-PROJ1-EXACS-DB-KEY';
local shared_vcn = 'VCN-FRA-LZ-SHARED-PLATFORM-EXACS-KEY';

assert std.objectHas(alpha_project.children, alpha_project_db);
assert std.objectHas(beta_project.children, beta_project_db);
assert std.objectHas(
  result.network.network_configuration.network_configuration_categories[
    'shared-platform-exacs'
  ].vcns,
  shared_vcn
);

{
  alpha_project_db: alpha_project_db,
  beta_project_db: beta_project_db,
  shared_vcn: shared_vcn,
}
