// EXACS shared platform contributes network, IAM, project DB layers, observability, and product-specific cloud resource policies
// contains: CMP-LZ-SHARED-EXACS-KEY
// contains: CMP-LZ-PROD-PROJ1-EXACS-DB-KEY
// contains: GRP-LZ-GLOBAL-EXACS-DB-ADMIN-KEY
// contains: GRP-LZ-GLOBAL-EXACS-INFRA-ADMIN-KEY
// contains: PCY-LZ-GLOBAL-EXACS-INFRA-ADMIN-KEY
// contains: NOTT-LZ-EXACS-DB-WORKLOADS-KEY
// contains: NOTT-LZ-PROD-EXACS-PROJECTS-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: AL-LZ-EXACS-DB-CLUSTER-CPUUTIL-KEY
// contains: cloudexadatainfrastructuremaintenance.begin
// contains: exacs-db@example.com
// contains: exacs-infra@example.com
// contains: exacs-projects@example.com
// contains: cloud-exadata-infrastructures
// contains: cloud-vmclusters
// contains: cloud-autonomous-vmclusters
// contains: CLOUD_VM_CLUSTER_UPDATE_GI_SOFTWARE
// contains: CLOUD_VM_CLUSTER_UPDATE_CPU
// contains: ConfigureExascaleCloudExadataInfrastructure
// contains: "product_display": "Exadata Database Service on Dedicated Infrastructure"
// contains: "project_db_uses_distinct_tag": true
// contains: "project_policy_manages_acd": false
// contains: "platform_acd_policy_attached_to_platform_db": true
// contains: "db_admin_uses_infra_tag_for_exadata": true
// contains: "db_admin_uses_autonomous_vmclusters": true
// contains: read autonomous-container-databases in compartment cmp-lz-shared-exacs-db
local lz = import 'gen/landing_zone.libsonnet';
local products = import 'gen/workload-extensions/exadb/products.libsonnet';

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

local policies = result.iam.policies_configuration.supplied_policies;
local project_policy = policies['PCY-LZ-PROD-EXACS-PROJ1-ADMIN-KEY'];
local platform_acd_policy = policies['PCY-LZ-SHARED-EXACS-PROJECT-ACD-READ-KEY'];
local global_db_policy = policies['PCY-LZ-GLOBAL-EXACS-DB-ADMIN-KEY'];
local prod_project_db = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY']
  .children['CMP-LZ-PROD-KEY']
  .children['CMP-LZ-PROD-PROJECTS-KEY']
  .children['CMP-LZ-PROD-PROJ1-KEY']
  .children['CMP-LZ-PROD-PROJ1-EXACS-DB-KEY'];
local statements_contain(statements, needle) = std.length([
  statement
  for statement in statements
  if std.length(std.findSubstr(needle, statement)) > 0
]) > 0;

std.manifestJsonEx({
  product_display: products.exacs.display,
  compartments: result.iam.compartments_configuration.compartments,
  groups: result.iam.identity_domain_groups_configuration.groups,
  policies: policies,
  observability_cis1: result.observability_cis1,
  project_db_uses_distinct_tag:
    prod_project_db.defined_tags['tagns-lz-role.tag-lz-role'] == 'lz-exacs-project-db-admin',
  project_policy_manages_acd:
    statements_contain(project_policy.statements, 'manage autonomous-container-databases'),
  platform_acd_policy_attached_to_platform_db:
    platform_acd_policy.compartment_id == 'CMP-LZ-SHARED-EXACS-DB-KEY',
  db_admin_uses_infra_tag_for_exadata: std.length([
    statement
    for statement in global_db_policy.statements
    if std.length(std.findSubstr('use cloud-exadata-infrastructures', statement)) > 0
       && std.length(std.findSubstr("'lz-exacs-infra-admin'", statement)) > 0
  ]) == 1,
  db_admin_uses_autonomous_vmclusters:
    statements_contain(global_db_policy.statements, 'use cloud-autonomous-vmclusters'),
}, '  ')
