// EXACC published UC1 keeps shared ExaDB-C@C platform compartments and includes AVMC/ADB-D project DB tiers
// contains: "multi_uc1_shared_children": [
// contains: "CMP-LZ-SHARED-EXACC-DB-KEY"
// contains: "multi_uc1_has_prod_env_exacc": false
// contains: "multi_uc1_has_preprod_env_exacc": false
// contains: "multi_uc1_prod_project_db": "cmp-lz-prod-proj1-exacc-db"
// contains: "single_uc1_has_prod_env_exacc": false
// contains: "single_uc1_has_preprod_env_exacc": false
// contains: "single_uc1_prod_project_db": "cmp-lz-prod-proj1-exacc-db"
// contains: "NOTT-LZ-PROD-EXACC-PROJECTS-KEY"
// contains: "RUL-LZ-PROD-NOTIFICATION-PROJECTS-KEY"
local multi_published = import 'gen/workload-extensions/exacc/multi-stack/published.libsonnet';
local profiles = import 'gen/workload-extensions/exacc/published_profiles.libsonnet';
local single_published = import 'gen/workload-extensions/exacc/single-stack/published.libsonnet';
local single_profiles = import 'gen/workload-extensions/exacc/single-stack/profiles.libsonnet';

local multi = multi_published.render(profiles.hub_e_prod_preprod_exacc_uc1_config);
local single = single_published.render(single_profiles.single_stack.uc1_config);

local child_keys(cmp) = std.sort(std.objectFields(cmp.children));
local multi_compartments = multi.identity.compartments_configuration.compartments;
local root_children(doc) = doc.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local single_env_platform_children(doc, env) =
  local platform =
    root_children(doc)['CMP-LZ-' + env + '-KEY']
    .children['CMP-LZ-' + env + '-PLATFORM-KEY'];
  if std.objectHas(platform, 'children') then platform.children else {};
local single_project_db(doc, env, project) =
  root_children(doc)['CMP-LZ-' + env + '-KEY']
  .children['CMP-LZ-' + env + '-PROJECTS-KEY']
  .children['CMP-LZ-' + env + '-' + project + '-KEY']
  .children['CMP-LZ-' + env + '-' + project + '-EXACC-DB-KEY'];

{
  multi_uc1_shared_children: child_keys(multi_compartments['CMP-LZ-SHARED-EXACC-KEY']),
  multi_uc1_has_prod_env_exacc: std.objectHas(multi_compartments, 'CMP-LZ-PROD-EXACC-KEY'),
  multi_uc1_has_preprod_env_exacc: std.objectHas(multi_compartments, 'CMP-LZ-PREPROD-EXACC-KEY'),
  multi_uc1_prod_project_db: multi_compartments['CMP-LZ-PROD-PROJ1-EXACC-DB-KEY'].name,
  multi_uc1_topics: std.sort(std.objectFields(multi.observability.notifications_configuration.topics)),
  multi_uc1_event_rules: std.sort(std.objectFields(multi.observability.events_configuration.event_rules)),
  single_uc1_has_prod_env_exacc: std.objectHas(single_env_platform_children(single, 'PROD'), 'CMP-LZ-PROD-EXACC-KEY'),
  single_uc1_has_preprod_env_exacc: std.objectHas(single_env_platform_children(single, 'PREPROD'), 'CMP-LZ-PREPROD-EXACC-KEY'),
  single_uc1_prod_project_db: single_project_db(single, 'PROD', 'PROJ1').name,
}
