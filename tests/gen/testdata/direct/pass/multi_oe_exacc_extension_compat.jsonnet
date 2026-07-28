// Multi-OE ExaDB-C@C qualifies identical prod/exacc platforms and project database tiers without networks.
// contains: "alpha_project_db": "CMP-LZ-ALPHA-PROD-PROJ1-EXACC-DB-KEY"
// contains: "beta_project_db": "CMP-LZ-BETA-PROD-PROJ1-EXACC-DB-KEY"
// contains: "alpha_alarm": "AL-LZ-ALPHA-PROD-CPUUTIL-KEY"
// contains: "beta_alarm": "AL-LZ-BETA-PROD-CPUUTIL-KEY"
// contains: "network_category_count": 1
local landing_zone = import 'gen/landing_zone.libsonnet';

local exacc_platform = {
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
};

local result = landing_zone({
  cis_level: 1,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: {
          projects: { proj1: {} },
          platforms: { exacc: exacc_platform },
        },
      },
    },
    beta: {
      display_name: 'Beta',
      dns: 'be',
      environments: {
        prod: {
          projects: { proj1: {} },
          platforms: { exacc: exacc_platform },
        },
      },
    },
  },
});

local root = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local alpha_env = root['CMP-LZ-ALPHA-KEY'].children['CMP-LZ-ALPHA-PROD-KEY'].children;
local beta_env = root['CMP-LZ-BETA-KEY'].children['CMP-LZ-BETA-PROD-KEY'].children;
local policies = result.iam.policies_configuration.supplied_policies;
local topics = result.observability_cis1.notifications_configuration.topics;
local rules = result.observability_cis1.events_configuration.event_rules;
local alarms = result.observability_cis1.alarms_configuration.alarms;
local categories = result.network.network_configuration.network_configuration_categories;
local alpha_project_db = 'CMP-LZ-ALPHA-PROD-PROJ1-EXACC-DB-KEY';
local beta_project_db = 'CMP-LZ-BETA-PROD-PROJ1-EXACC-DB-KEY';
local alpha_alarm = 'AL-LZ-ALPHA-PROD-CPUUTIL-KEY';
local beta_alarm = 'AL-LZ-BETA-PROD-CPUUTIL-KEY';

assert std.objectHas(
  alpha_env['CMP-LZ-ALPHA-PROD-PROJECTS-KEY']
    .children['CMP-LZ-ALPHA-PROD-PROJ1-KEY'].children,
  alpha_project_db
);
assert std.objectHas(
  beta_env['CMP-LZ-BETA-PROD-PROJECTS-KEY']
    .children['CMP-LZ-BETA-PROD-PROJ1-KEY'].children,
  beta_project_db
);
assert std.objectHas(
  alpha_env['CMP-LZ-ALPHA-PROD-PLATFORM-KEY'].children,
  'CMP-LZ-ALPHA-PROD-EXACC-KEY'
);
assert std.objectHas(
  beta_env['CMP-LZ-BETA-PROD-PLATFORM-KEY'].children,
  'CMP-LZ-BETA-PROD-EXACC-KEY'
);
assert std.objectHas(policies, 'PCY-LZ-ALPHA-PROD-EXACC-PROJ1-ADMIN-KEY');
assert std.objectHas(policies, 'PCY-LZ-BETA-PROD-EXACC-PROJ1-ADMIN-KEY');
assert std.objectHas(topics, 'NOTT-LZ-ALPHA-PROD-EXACC-PROJECTS-KEY');
assert std.objectHas(topics, 'NOTT-LZ-BETA-PROD-EXACC-PROJECTS-KEY');
assert std.objectHas(rules, 'RUL-LZ-ALPHA-PROD-NOTIFICATION-PROJECTS-KEY');
assert std.objectHas(rules, 'RUL-LZ-BETA-PROD-NOTIFICATION-PROJECTS-KEY');
assert std.objectHas(rules, 'RUL-LZ-ALPHA-PROD-NOTIFICATION-PLATFORM-EXACC-DB-KEY');
assert std.objectHas(rules, 'RUL-LZ-BETA-PROD-NOTIFICATION-PLATFORM-EXACC-DB-KEY');
assert std.objectHas(alarms, alpha_alarm);
assert std.objectHas(alarms, beta_alarm);
assert alarms[alpha_alarm].compartment_id == 'CMP-LZ-ALPHA-PROD-EXACC-DB-KEY';
assert alarms[beta_alarm].compartment_id == 'CMP-LZ-BETA-PROD-EXACC-DB-KEY';
assert alarms[alpha_alarm].destination_topic_ids ==
       ['NOTT-LZ-ALPHA-PROD-EXACC-DB-WORKLOADS-KEY'];
assert alarms[beta_alarm].destination_topic_ids ==
       ['NOTT-LZ-BETA-PROD-EXACC-DB-WORKLOADS-KEY'];
assert std.length([
  key
  for key in std.objectFields(categories)
  if std.length(std.findSubstr('exacc', key)) > 0
]) == 0;

{
  alpha_project_db: alpha_project_db,
  beta_project_db: beta_project_db,
  alpha_project_policy: 'PCY-LZ-ALPHA-PROD-EXACC-PROJ1-ADMIN-KEY',
  beta_project_policy: 'PCY-LZ-BETA-PROD-EXACC-PROJ1-ADMIN-KEY',
  alpha_alarm: alpha_alarm,
  beta_alarm: beta_alarm,
  network_category_count: std.length(std.objectFields(categories)),
}
