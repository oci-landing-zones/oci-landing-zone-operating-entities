// EXACC single-stack publication exposes distinct UC2 and UC3 generated surfaces
// contains: "uc2_identity_prod_children": [
// contains: "CMP-LZ-PROD-EXACC-DB-KEY"
// contains: "uc2_identity_shared_children": [
// contains: "CMP-LZ-SHARED-EXACC-INFRA-KEY"
// contains: "uc2_governance_tag_namespaces": [
// contains: "TAGNS-LZ-ROLE-KEY"
// contains: "uc2_security_cis2_vaults": [
// contains: "VLT-LZ-SHARED-SECURITY-KEY"
// contains: "uc2_observability_cis1_event_rules": [
// contains: "RUL-LZ-PROD-NOTIFICATION-PLATFORM-EXACC-DB-KEY"
// contains: "uc3_identity_shared_exists": false
// contains: "uc3_identity_prod_children": [
// contains: "CMP-LZ-PROD-EXACC-INFRA-KEY"
// contains: "uc3_security_cis1_targets": [
// contains: "SZ-TGT-LZ-CIS-L1-KEY"
// contains: "uc3_observability_cis2_alarms": [
// contains: "AL-LZ-PROD-CPUUTIL-KEY"
local published = import 'gen/workload-extensions/exacc/single-stack/published.libsonnet';
local profiles = import 'gen/workload-extensions/exacc/single-stack/profiles.libsonnet';

local uc2 = published.render(profiles.single_stack.uc2_config);
local uc3 = published.render(profiles.single_stack.uc3_config);

local child_keys(cmp) = std.sort(std.objectFields(cmp.children));
local root_children(doc) = doc.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local shared_exacc(doc) = root_children(doc)['CMP-LZ-PLATFORM-KEY'].children['CMP-LZ-SHARED-EXACC-KEY'];
local env_exacc(doc, env) =
  root_children(doc)['CMP-LZ-' + env + '-KEY']
  .children['CMP-LZ-' + env + '-PLATFORM-KEY']
  .children['CMP-LZ-' + env + '-EXACC-KEY'];

{
  uc2_identity_prod_children: child_keys(env_exacc(uc2, 'PROD')),
  uc2_identity_shared_children: child_keys(shared_exacc(uc2)),
  uc2_governance_tag_namespaces: std.sort(std.objectFields(uc2.governance.tags_configuration.namespaces)),
  uc2_security_cis2_vaults: std.sort(std.objectFields(uc2.security_cis2.vaults_configuration.vaults)),
  uc2_observability_cis1_event_rules: std.sort(std.objectFields(uc2.observability_cis1.events_configuration.event_rules)),
  uc3_identity_shared_exists: std.objectHas(root_children(uc3)['CMP-LZ-PLATFORM-KEY'], 'children')
                              && std.objectHas(root_children(uc3)['CMP-LZ-PLATFORM-KEY'].children, 'CMP-LZ-SHARED-EXACC-KEY'),
  uc3_identity_prod_children: child_keys(env_exacc(uc3, 'PROD')),
  uc3_security_cis1_targets: std.sort(std.objectFields(uc3.security_cis1.security_zones_configuration.security_zones)),
  uc3_observability_cis2_alarms: std.sort(std.objectFields(uc3.observability_cis2.alarms_configuration.alarms)),
}
