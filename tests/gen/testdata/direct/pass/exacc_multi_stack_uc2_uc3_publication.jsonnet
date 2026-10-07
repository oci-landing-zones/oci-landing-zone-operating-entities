// EXACC multi-stack publication exposes distinct UC2 and UC3 generated surfaces
// contains: "uc2_shared_children": [
// contains: "CMP-LZ-SHARED-EXACC-INFRA-KEY"
// contains: "uc2_has_prod_exacc_root": true
// contains: "uc2_has_preprod_exacc_root": true
// contains: "uc2_prod_children": [
// contains: "CMP-LZ-PROD-EXACC-DB-KEY"
// contains: "uc2_preprod_children": [
// contains: "CMP-LZ-PREPROD-EXACC-DB-KEY"
// contains: "uc2_has_prod_project_db": true
// contains: "uc2_has_preprod_project_db": true
// contains: "RUL-LZ-NOTIFICATION-PLATFORM-EXACC-INFRA-KEY"
// contains: "uc2_prod_has_db_rule": true
// contains: "uc2_prod_has_infra_rule": false
// contains: "AL-LZ-PROD-CPUUTIL-KEY"
// contains: "uc2_ownership_is_global_infra_plus_environment": true
// contains: "uc2_prod_policy_scope_is_environment": true
// contains: "uc2_shared_dependency_policy_is_scoped": true
// contains: "uc2_env_dba_can_use_avmc": true
// contains: "uc3_shared_exists": false
// contains: "uc3_prod_children": [
// contains: "CMP-LZ-PROD-EXACC-INFRA-KEY"
// contains: "RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACC-DB-KEY"
// contains: "AL-LZ-PROD-CPUUTIL-KEY"
// contains: "uc3_alarm_count": 14
// contains: "uc3_uses_environment_ownership": true
// contains: "uc3_has_shared_dependency_policy": false
// contains: "uc3_prod_dba_uses_local_infrastructure": true
local published = import 'gen/workload-extensions/exacc/multi-stack/published.libsonnet';
local profiles = import 'gen/workload-extensions/exacc/published_profiles.libsonnet';

local uc2 = published.render(profiles.hub_e_prod_preprod_exacc_uc2_config);
local uc3 = published.render(profiles.hub_e_prod_preprod_exacc_uc3_config);

local child_keys(cmp) = std.sort(std.objectFields(cmp.children));
local maybe_child_keys(cmp_map, key) =
  if std.objectHas(cmp_map, key) then child_keys(cmp_map[key]) else [];
local uc2_cmps = uc2.identity.compartments_configuration.compartments;
local uc2_group_keys = std.objectFields(uc2.identity.identity_domain_groups_configuration.groups);
local uc2_policies = uc2.identity.policies_configuration.supplied_policies;
local uc3_group_keys = std.objectFields(uc3.identity.identity_domain_groups_configuration.groups);
local uc3_policies = uc3.identity.policies_configuration.supplied_policies;
local statements_contain(statements, needle) = std.length([
  statement
  for statement in statements
  if std.length(std.findSubstr(needle, statement)) > 0
]) > 0;

{
  uc2_shared_children: child_keys(uc2_cmps['CMP-LZ-SHARED-EXACC-KEY']),
  uc2_has_prod_exacc_root: std.objectHas(uc2_cmps, 'CMP-LZ-PROD-EXACC-KEY'),
  uc2_has_preprod_exacc_root: std.objectHas(uc2_cmps, 'CMP-LZ-PREPROD-EXACC-KEY'),
  uc2_prod_children: maybe_child_keys(uc2_cmps, 'CMP-LZ-PROD-EXACC-KEY'),
  uc2_preprod_children: maybe_child_keys(uc2_cmps, 'CMP-LZ-PREPROD-EXACC-KEY'),
  uc2_has_prod_project_db: std.objectHas(uc2_cmps, 'CMP-LZ-PROD-PROJ1-EXACC-DB-KEY'),
  uc2_has_preprod_project_db: std.objectHas(uc2_cmps, 'CMP-LZ-PREPROD-PROJ1-EXACC-DB-KEY'),
  uc2_event_rules: std.sort(std.objectFields(uc2.observability.events_configuration.event_rules)),
  uc2_prod_has_db_rule: std.objectHas(uc2.observability.events_configuration.event_rules, 'RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACC-DB-KEY'),
  uc2_prod_has_infra_rule: std.objectHas(uc2.observability.events_configuration.event_rules, 'RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACC-INFRA-KEY'),
  uc2_alarms: std.sort(std.objectFields(uc2.observability.alarms_configuration.alarms)),
  uc2_ownership_is_global_infra_plus_environment:
    std.member(uc2_group_keys, 'GRP-LZ-GLOBAL-INFRA-ADMIN-KEY')
    && !std.member(uc2_group_keys, 'GRP-LZ-GLOBAL-DB-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PROD-EXACC-INFRA-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PROD-EXACC-DB-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PREPROD-EXACC-INFRA-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PREPROD-EXACC-DB-ADMIN-KEY'),
  uc2_prod_policy_scope_is_environment:
    uc2_policies['PCY-LZ-PROD-EXACC-INFRA-ADMIN-KEY'].compartment_id == 'CMP-LZ-PROD-KEY'
    && std.length([
      statement
      for statement in uc2_policies['PCY-LZ-PROD-EXACC-INFRA-ADMIN-KEY'].statements
      if std.length(std.findSubstr('cmp-landingzone', statement)) > 0
         || std.length(std.findSubstr('cmp-lz-preprod', statement)) > 0
    ]) == 0,
  uc2_shared_dependency_policy_is_scoped:
    uc2_policies['PCY-LZ-PROD-EXACC-SHARED-INFRA-USE-KEY'].compartment_id == 'CMP-LZ-SHARED-EXACC-KEY'
    && statements_contain(
      uc2_policies['PCY-LZ-PROD-EXACC-SHARED-INFRA-USE-KEY'].statements,
      'use exadata-infrastructures in compartment cmp-lz-shared-exacc-infra'
    )
    && !statements_contain(
      uc2_policies['PCY-LZ-PROD-EXACC-SHARED-INFRA-USE-KEY'].statements,
      'cmp-lz-preprod'
    ),
  uc2_env_dba_can_use_avmc:
    statements_contain(
      uc2_policies['PCY-LZ-PROD-EXACC-DB-ADMIN-KEY'].statements,
      'use autonomous-vmclusters in compartment cmp-lz-prod-platform:cmp-lz-prod-exacc:cmp-lz-prod-exacc-db'
    ),
  uc3_shared_exists: std.objectHas(uc3.identity.compartments_configuration.compartments, 'CMP-LZ-SHARED-EXACC-KEY'),
  uc3_prod_children: child_keys(uc3.identity.compartments_configuration.compartments['CMP-LZ-PROD-EXACC-KEY']),
  uc3_event_rules: std.sort(std.objectFields(uc3.observability.events_configuration.event_rules)),
  uc3_alarms: std.sort(std.objectFields(uc3.observability.alarms_configuration.alarms)),
  uc3_alarm_count: std.length(std.objectFields(uc3.observability.alarms_configuration.alarms)),
  uc3_uses_environment_ownership:
    !std.member(uc3_group_keys, 'GRP-LZ-GLOBAL-INFRA-ADMIN-KEY')
    && !std.member(uc3_group_keys, 'GRP-LZ-GLOBAL-DB-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PROD-EXACC-INFRA-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PROD-EXACC-DB-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PREPROD-EXACC-INFRA-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PREPROD-EXACC-DB-ADMIN-KEY'),
  uc3_has_shared_dependency_policy:
    std.objectHas(uc3_policies, 'PCY-LZ-PROD-EXACC-SHARED-INFRA-USE-KEY'),
  uc3_prod_dba_uses_local_infrastructure:
    statements_contain(
      uc3_policies['PCY-LZ-PROD-EXACC-DB-ADMIN-KEY'].statements,
      'use exadata-infrastructures in compartment cmp-lz-prod-platform:cmp-lz-prod-exacc:cmp-lz-prod-exacc-infra'
    ),
}
