// ExaCC use case 1 contributes shared/env platform IAM, project DB layers, observability, and topic-specific recipients
// contains: CMP-LZ-SHARED-EXACC-KEY
// contains: CMP-LZ-PROD-EXACC-KEY
// contains: CMP-LZ-PREPROD-EXACC-KEY
// contains: CMP-LZ-PROD-EXACC-DB-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACC-DB-KEY
// contains: cmp-lz-prod-proj1-exacc-db
// contains: GRP-LZ-GLOBAL-DB-ADMIN-KEY
// contains: PCY-LZ-GLOBAL-EXACC-INFRA-ADMIN-KEY
// contains: NOTT-LZ-EXACC-SHARED-INFRA-WORKLOADS-KEY
// contains: RUL-LZ-NOTIFICATION-PLATFORM-EXACC-VMC-KEY
// contains: AL-LZ-DB-CLUSTER-CPUUTIL-KEY
// contains: exacc-db@example.com
// contains: exacc-infra@example.com
// contains: exacc-projects@example.com
// contains: "db_admin_uses_infra_tag_for_exadata": true
// contains: "infra_admin_uses_exacc_vm_permissions": true
// contains: "db_admin_uses_exacc_vm_permissions": true
// contains: "infra_admin_uses_autonomous_vmclusters": true
// contains: "db_admin_uses_autonomous_vmclusters": true
// contains: "project_db_uses_distinct_tag": true
// contains: "project_policy_manages_acd": false
// contains: "platform_acd_policy_attached_to_platform_db": true
// contains: read autonomous-container-databases in compartment cmp-lz-prod-exacc-db
local lz = import 'gen/landing_zone.libsonnet';

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

local result = lz({
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
});

local global_db_policy = result.iam.policies_configuration.supplied_policies['PCY-LZ-GLOBAL-EXACC-DB-ADMIN-KEY'];
local global_infra_policy = result.iam.policies_configuration.supplied_policies['PCY-LZ-GLOBAL-EXACC-INFRA-ADMIN-KEY'];
local project_policy = result.iam.policies_configuration.supplied_policies['PCY-LZ-PROD-EXACC-PROJ1-ADMIN-KEY'];
local platform_acd_policy = result.iam.policies_configuration.supplied_policies['PCY-LZ-PROD-EXACC-PROJECT-ACD-READ-KEY'];
local prod_project_db = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY']
  .children['CMP-LZ-PROD-KEY']
  .children['CMP-LZ-PROD-PROJECTS-KEY']
  .children['CMP-LZ-PROD-PROJ1-KEY']
  .children['CMP-LZ-PROD-PROJ1-EXACC-DB-KEY'];
local statements_contain(statements, needle) = std.length([
  statement
  for statement in statements
  if std.length(std.findSubstr(needle, statement)) > 0
]) > 0;

std.manifestJsonEx({
  compartments: result.iam.compartments_configuration.compartments,
  iam_keys: std.objectFields(result.iam.identity_domain_groups_configuration.groups)
    + std.objectFields(result.iam.policies_configuration.supplied_policies),
  obs_keys: std.objectFields(result.observability_cis1.notifications_configuration.topics)
    + std.objectFields(result.observability_cis1.events_configuration.event_rules)
    + std.objectFields(result.observability_cis1.alarms_configuration.alarms),
  topic_emails: {
    db: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-EXACC-DB-WORKLOADS-KEY'].subscriptions[0].values,
    infra: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-EXACC-SHARED-INFRA-WORKLOADS-KEY'].subscriptions[0].values,
    prod_projects: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-PROD-EXACC-PROJECTS-KEY'].subscriptions[0].values,
  },
  topic_descriptions: {
    db: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-EXACC-DB-WORKLOADS-KEY'].description,
    prod_projects: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-PROD-EXACC-PROJECTS-KEY'].description,
  },
  policy_description: result.iam.policies_configuration.supplied_policies['PCY-LZ-PROD-EXACC-PROJ1-ADMIN-KEY'].description,
  db_admin_uses_infra_tag_for_exadata: std.length([
    statement
    for statement in global_db_policy.statements
    if std.length(std.findSubstr('use exadata-infrastructures', statement)) > 0
       && std.length(std.findSubstr("'lz-exacc-infra-admin'", statement)) > 0
  ]) == 1,
  infra_admin_uses_exacc_vm_permissions:
    statements_contain(global_infra_policy.statements, "request.permission !='VM_CLUSTER_UPDATE_GI_SOFTWARE'"),
  db_admin_uses_exacc_vm_permissions:
    statements_contain(global_db_policy.statements, "request.permission !='VM_CLUSTER_UPDATE_CPU'"),
  infra_admin_uses_autonomous_vmclusters:
    statements_contain(global_infra_policy.statements, 'manage autonomous-vmclusters'),
  db_admin_uses_autonomous_vmclusters:
    statements_contain(global_db_policy.statements, 'use autonomous-vmclusters'),
  project_db_uses_distinct_tag:
    prod_project_db.defined_tags['tagns-lz-role.tag-lz-role'] == 'lz-exacc-project-db-admin',
  project_policy_manages_acd:
    statements_contain(project_policy.statements, 'manage autonomous-container-databases'),
  platform_acd_policy_attached_to_platform_db:
    platform_acd_policy.compartment_id == 'CMP-LZ-PROD-EXACC-DB-KEY',
  platform_acd_policy_statements: platform_acd_policy.statements,
}, '  ')
