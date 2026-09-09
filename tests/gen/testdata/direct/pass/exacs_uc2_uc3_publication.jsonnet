// EXACS published profiles expose coherent UC1, UC2, and UC3 placement and observability surfaces
// contains: "uc1_shared_cidr": "10.0.24.0/21"
// contains: "uc1_has_only_shared_exacs": true
// contains: "uc1_project_mapping_is_prod_preprod": true
// contains: "uc1_shared_project_environments": [
// contains: "preprod"
// contains: "prod"
// contains: "uc2_prod_cidr": "10.0.104.0/21"
// contains: "uc2_preprod_cidr": "10.0.168.0/21"
// contains: "uc2_shared_children": [
// contains: "CMP-LZ-SHARED-EXACS-INFRA-KEY"
// contains: "uc2_shared_has_db": false
// contains: "uc2_prod_children": [
// contains: "CMP-LZ-PROD-EXACS-DB-KEY"
// contains: "uc2_network_categories": [
// contains: "preprod-platform-exacs"
// contains: "prod-platform-exacs"
// contains: "uc2_alarm_default_compartment": "CMP-LZ-PROD-EXACS-DB-KEY"
// contains: "uc2_components_are_explicit": true
// contains: "uc2_ownership_is_global_infra_plus_environment": true
// contains: "uc2_prod_policy_scope_is_environment": true
// contains: "uc2_shared_dependency_policy_is_scoped": true
// contains: "uc2_env_dba_can_use_avmc": true
// contains: AL-LZ-PROD-EXACS-DB-CLUSTER-CPUUTIL-KEY
// contains: AL-LZ-PREPROD-EXACS-DB-CLUSTER-CPUUTIL-KEY
// contains: RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACS-VMC-KEY
// contains: RUL-LZ-PREPROD-NOTIFICATION-PLATFORM-EXACS-VMC-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: RUL-LZ-PREPROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: "uc3_prod_cidr": "10.0.104.0/21"
// contains: "uc3_preprod_cidr": "10.0.168.0/21"
// contains: "uc3_shared_exists": false
// contains: "uc3_prod_children": [
// contains: "CMP-LZ-PROD-EXACS-INFRA-KEY"
// contains: "uc3_components_are_explicit": true
// contains: "uc3_uses_environment_ownership": true
// contains: "uc3_has_shared_dependency_policy": false
// contains: "uc3_prod_dba_uses_local_infrastructure": true
// contains: "uc3_alarm_count": 14
// contains: "uc3_has_shared_platform_events": false
// contains: RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACS-INFRA-KEY
// contains: RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACS-VMC-KEY
// contains: RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACS-DB-KEY
// contains: RUL-LZ-PREPROD-NOTIFICATION-PLATFORM-EXACS-INFRA-KEY
// contains: RUL-LZ-PREPROD-NOTIFICATION-PLATFORM-EXACS-VMC-KEY
// contains: RUL-LZ-PREPROD-NOTIFICATION-PLATFORM-EXACS-DB-KEY
// contains: RUL-LZ-PROD-EXACS-NOTIFICATION-PROJECTS-KEY
// contains: RUL-LZ-PREPROD-EXACS-NOTIFICATION-PROJECTS-KEY
local lz = import 'gen/landing_zone.libsonnet';
local single_profiles = import 'gen/workload-extensions/exacs/single-stack/profiles.libsonnet';
local multi_profiles = import 'gen/workload-extensions/exacs/multi-stack/profiles.libsonnet';
local multi_published = import 'gen/workload-extensions/exacs/multi-stack/published.libsonnet';

local network_categories(network_doc) =
  network_doc.network_configuration.network_configuration_categories;

local category_cidr(network_doc, category_key) =
  local category = network_categories(network_doc)[category_key];
  local vcn_keys = std.objectFields(category.vcns);
  category.vcns[vcn_keys[0]].cidr_blocks[0];

local child_keys(cmp) =
  if std.objectHas(cmp, 'children') then std.sort(std.objectFields(cmp.children)) else [];

local uc1_single = lz(single_profiles.uc1.config);
local uc2_single = lz(single_profiles.uc2.config);
local uc3_single = lz(single_profiles.uc3.config);
local uc2_multi = multi_published.render(multi_profiles.uc2_hub_e.config);
local uc3_multi = multi_published.render(multi_profiles.uc3_hub_e.config);

local uc2_cmps = uc2_multi.identity.compartments_configuration.compartments;
local uc3_cmps = uc3_multi.identity.compartments_configuration.compartments;
local uc1_config = single_profiles.uc1.config;
local uc1_shared_params = uc1_config.shared_platforms.exacs.extension.params;
local uc2_config = multi_profiles.uc2_hub_e.config;
local uc3_config = multi_profiles.uc3_hub_e.config;
local uc2_groups = uc2_multi.identity.identity_domain_groups_configuration.groups;
local uc2_group_keys = std.objectFields(uc2_groups);
local uc2_policies = uc2_multi.identity.policies_configuration.supplied_policies;
local uc3_groups = uc3_multi.identity.identity_domain_groups_configuration.groups;
local uc3_group_keys = std.objectFields(uc3_groups);
local uc3_policies = uc3_multi.identity.policies_configuration.supplied_policies;
local uc2_alarm_keys = std.sort(std.objectFields(
  uc2_multi.observability.alarms_configuration.alarms
));
local uc2_event_rule_keys = std.sort(std.objectFields(
  uc2_multi.observability.events_configuration.event_rules
));
local uc3_alarm_keys = std.sort(std.objectFields(
  uc3_multi.observability.alarms_configuration.alarms
));
local uc3_event_rule_keys = std.sort(std.objectFields(
  uc3_multi.observability.events_configuration.event_rules
));
local infra_only = { infrastructure: true, database: false };
local db_only = { infrastructure: false, database: true };
local infra_and_db = { infrastructure: true, database: true };
local statements_contain(statements, needle) = std.length([
  statement
  for statement in statements
  if std.length(std.findSubstr(needle, statement)) > 0
]) > 0;

{
  uc1_shared_cidr: category_cidr(uc1_single.network, 'shared-platform-exacs'),
  uc1_has_only_shared_exacs:
    !std.objectHas(uc1_config.environments.prod, 'platforms')
    && !std.objectHas(uc1_config.environments.preprod, 'platforms'),
  uc1_shared_project_environments:
    if std.objectHas(uc1_shared_params, 'project_db_compartments') then
      std.sort(std.objectFields(uc1_shared_params.project_db_compartments))
    else [],
  uc1_project_mapping_is_prod_preprod:
    std.objectHas(uc1_shared_params, 'project_db_compartments')
    && uc1_shared_params.project_db_compartments == {
      prod: ['proj1'],
      preprod: ['proj1'],
    },

  uc2_prod_cidr: category_cidr(uc2_single.network, 'prod-platform-exacs'),
  uc2_preprod_cidr: category_cidr(uc2_single.network, 'preprod-platform-exacs'),
  uc2_network_categories: std.sort([
    key
    for key in std.objectFields(network_categories(uc2_multi.network))
    if std.length(std.findSubstr('platform-exacs', key)) > 0
  ]),
  uc2_shared_children: child_keys(uc2_cmps['CMP-LZ-SHARED-EXACS-KEY']),
  uc2_shared_has_db: std.objectHas(
    uc2_cmps['CMP-LZ-SHARED-EXACS-KEY'].children,
    'CMP-LZ-SHARED-EXACS-DB-KEY'
  ),
  uc2_prod_children: child_keys(uc2_cmps['CMP-LZ-PROD-EXACS-KEY']),
  uc2_alarm_default_compartment: uc2_multi.observability.alarms_configuration.default_compartment_id,
  uc2_components_are_explicit:
    std.objectHas(uc2_config.shared_platforms.exacs, 'publication_components')
    && std.objectHas(uc2_config.environments.prod.platforms.exacs, 'publication_components')
    && std.objectHas(uc2_config.environments.preprod.platforms.exacs, 'publication_components')
    && uc2_config.shared_platforms.exacs.publication_components == infra_only
    && uc2_config.environments.prod.platforms.exacs.publication_components == db_only
    && uc2_config.environments.preprod.platforms.exacs.publication_components == db_only,
  uc2_ownership_is_global_infra_plus_environment:
    std.member(uc2_group_keys, 'GRP-LZ-GLOBAL-EXACS-INFRA-ADMIN-KEY')
    && !std.member(uc2_group_keys, 'GRP-LZ-GLOBAL-EXACS-DB-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PROD-EXACS-INFRA-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PROD-EXACS-DB-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PREPROD-EXACS-INFRA-ADMIN-KEY')
    && std.member(uc2_group_keys, 'GRP-LZ-PREPROD-EXACS-DB-ADMIN-KEY'),
  uc2_prod_policy_scope_is_environment:
    uc2_policies['PCY-LZ-PROD-EXACS-INFRA-ADMIN-KEY'].compartment_id == 'CMP-LZ-PROD-KEY'
    && std.length([
      statement
      for statement in uc2_policies['PCY-LZ-PROD-EXACS-INFRA-ADMIN-KEY'].statements
      if std.length(std.findSubstr('cmp-landingzone', statement)) > 0
         || std.length(std.findSubstr('cmp-lz-preprod', statement)) > 0
    ]) == 0,
  uc2_shared_dependency_policy_is_scoped:
    uc2_policies['PCY-LZ-PROD-EXACS-SHARED-INFRA-USE-KEY'].compartment_id == 'CMP-LZ-SHARED-EXACS-KEY'
    && statements_contain(
      uc2_policies['PCY-LZ-PROD-EXACS-SHARED-INFRA-USE-KEY'].statements,
      'use cloud-exadata-infrastructures in compartment cmp-lz-shared-exacs-infra'
    )
    && !statements_contain(
      uc2_policies['PCY-LZ-PROD-EXACS-SHARED-INFRA-USE-KEY'].statements,
      'cmp-lz-preprod'
    ),
  uc2_env_dba_can_use_avmc:
    statements_contain(
      uc2_policies['PCY-LZ-PROD-EXACS-DB-ADMIN-KEY'].statements,
      'use cloud-autonomous-vmclusters in compartment cmp-lz-prod-platform:cmp-lz-prod-exacs:cmp-lz-prod-exacs-db'
    ),
  uc2_alarm_keys: uc2_alarm_keys,
  uc2_event_rule_keys: uc2_event_rule_keys,

  uc3_prod_cidr: category_cidr(uc3_single.network, 'prod-platform-exacs'),
  uc3_preprod_cidr: category_cidr(uc3_single.network, 'preprod-platform-exacs'),
  uc3_shared_exists: std.objectHas(uc3_cmps, 'CMP-LZ-SHARED-EXACS-KEY'),
  uc3_prod_children: child_keys(uc3_cmps['CMP-LZ-PROD-EXACS-KEY']),
  uc3_components_are_explicit:
    std.objectHas(uc3_config.environments.prod.platforms.exacs, 'publication_components')
    && std.objectHas(uc3_config.environments.preprod.platforms.exacs, 'publication_components')
    && uc3_config.environments.prod.platforms.exacs.publication_components == infra_and_db
    && uc3_config.environments.preprod.platforms.exacs.publication_components == infra_and_db,
  uc3_uses_environment_ownership:
    !std.member(uc3_group_keys, 'GRP-LZ-GLOBAL-EXACS-INFRA-ADMIN-KEY')
    && !std.member(uc3_group_keys, 'GRP-LZ-GLOBAL-EXACS-DB-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PROD-EXACS-INFRA-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PROD-EXACS-DB-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PREPROD-EXACS-INFRA-ADMIN-KEY')
    && std.member(uc3_group_keys, 'GRP-LZ-PREPROD-EXACS-DB-ADMIN-KEY'),
  uc3_has_shared_dependency_policy:
    std.objectHas(uc3_policies, 'PCY-LZ-PROD-EXACS-SHARED-INFRA-USE-KEY'),
  uc3_prod_dba_uses_local_infrastructure:
    statements_contain(
      uc3_policies['PCY-LZ-PROD-EXACS-DB-ADMIN-KEY'].statements,
      'use cloud-exadata-infrastructures in compartment cmp-lz-prod-platform:cmp-lz-prod-exacs:cmp-lz-prod-exacs-infra'
    ),
  uc3_alarm_count: std.length(uc3_alarm_keys),
  uc3_has_shared_platform_events:
    std.member(uc3_event_rule_keys, 'RUL-LZ-NOTIFICATION-PLATFORM-EXACS-INFRA-KEY')
    || std.member(uc3_event_rule_keys, 'RUL-LZ-NOTIFICATION-PLATFORM-EXACS-DB-KEY')
    || std.member(uc3_event_rule_keys, 'RUL-LZ-NOTIFICATION-PLATFORM-EXACS-VMC-KEY'),
  uc3_event_rule_keys: uc3_event_rule_keys,
}
