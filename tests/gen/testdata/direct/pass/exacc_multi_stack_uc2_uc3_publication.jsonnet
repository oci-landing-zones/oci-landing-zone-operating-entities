// EXACC multi-stack publication exposes distinct UC2 and UC3 generated surfaces
// contains: "uc2_shared_children": [
// contains: "CMP-LZ-SHARED-EXACC-DB-KEY"
// contains: "CMP-LZ-SHARED-EXACC-INFRA-KEY"
// contains: "uc2_has_prod_exacc_root": true
// contains: "uc2_has_preprod_exacc_root": true
// contains: "uc2_prod_children": [
// contains: "CMP-LZ-PROD-EXACC-DB-KEY"
// contains: "CMP-LZ-PROD-EXACC-INFRA-KEY"
// contains: "uc2_preprod_children": [
// contains: "CMP-LZ-PREPROD-EXACC-DB-KEY"
// contains: "CMP-LZ-PREPROD-EXACC-INFRA-KEY"
// contains: "uc2_has_prod_project_db": true
// contains: "uc2_has_preprod_project_db": true
// contains: "RUL-LZ-NOTIFICATION-PLATFORM-EXACC-DB-KEY"
// contains: "uc2_prod_has_db_rule": true
// contains: "uc2_prod_has_infra_rule": true
// contains: "AL-LZ-CPUUTIL-KEY"
// contains: "uc3_shared_exists": false
// contains: "uc3_prod_children": [
// contains: "CMP-LZ-PROD-EXACC-INFRA-KEY"
// contains: "RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACC-DB-KEY"
// contains: "AL-LZ-PROD-CPUUTIL-KEY"
local published = import 'gen/workload-extensions/exacc/multi-stack/published.libsonnet';
local profiles = import 'gen/workload-extensions/exacc/published_profiles.libsonnet';

local uc2 = published.render(profiles.hub_e_prod_preprod_exacc_uc2_config);
local uc3 = published.render(profiles.hub_e_prod_preprod_exacc_uc3_config);

local child_keys(cmp) = std.sort(std.objectFields(cmp.children));
local maybe_child_keys(cmp_map, key) =
  if std.objectHas(cmp_map, key) then child_keys(cmp_map[key]) else [];
local uc2_cmps = uc2.identity.compartments_configuration.compartments;

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
  uc3_shared_exists: std.objectHas(uc3.identity.compartments_configuration.compartments, 'CMP-LZ-SHARED-EXACC-KEY'),
  uc3_prod_children: child_keys(uc3.identity.compartments_configuration.compartments['CMP-LZ-PROD-EXACC-KEY']),
  uc3_event_rules: std.sort(std.objectFields(uc3.observability.events_configuration.event_rules)),
  uc3_alarms: std.sort(std.objectFields(uc3.observability.alarms_configuration.alarms)),
}
