// IAM builder keeps compartments, groups, domains, and policy statement contracts stable.
// contains: "common_domain_display_name": "id_lz_common"
// contains: "project_group_name": "grp-lz-prod-proj1-admin"
// contains: "project_admin_first_statement": "allow group 'id_lz_common'/'grp-lz-prod-proj1-admin' to read all-resources in compartment cmp-lz-prod-proj1"
// contains: "network_admin_uses_tbac": true
// contains: "security_admin_uses_tbac": true
// contains: "network_admin_manages_nsgs_across_lz": true
// contains: "project_nsg_scope_failures": []
// contains: "security_admin_reads_all_lz_resources": true
// contains: "tenancy_security_admin_uses_tag_namespaces": true
local one = import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_iam.jsonnet';

local root_children = one.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local groups = one.identity_domain_groups_configuration.groups;
local policies = one.policies_configuration.supplied_policies;
local project_policy = policies['PCY-LZ-PROD-PROJ1-ADMIN-KEY'];
local network_policy_text = std.manifestJsonEx(policies['PCY-LZ-NETWORK-ADMIN-KEY'].statements, '  ');
local security_policy_text = std.manifestJsonEx(policies['PCY-LZ-SECURITY-ADMIN-KEY'].statements, '  ');

{
  root_child_keys: std.sort(std.objectFields(root_children)),
  common_domain_display_name:
    one.identity_domains_configuration.identity_domains['COMMON-DOMAIN'].display_name,
  project_group_name: groups['GRP-LZ-PROD-PROJ1-ADMIN-KEY'].name,
  project_admin_first_statement: project_policy.statements[0],
  project_admin_statement_count: std.length(project_policy.statements),
  project_network_policy_compartment_id:
    policies['PCY-LZ-PROD-PROJ1-ADMIN-NET-KEY'].compartment_id,
  project_security_policy_compartment_id:
    policies['PCY-LZ-PROD-PROJ1-ADMIN-SEC-KEY'].compartment_id,
  network_admin_uses_tbac:
    std.length(std.findSubstr('sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role', network_policy_text)) > 0,
  security_admin_uses_tbac:
    std.length(std.findSubstr('sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role', security_policy_text)) > 0,
  network_admin_manages_nsgs_across_lz:
    std.member(policies['PCY-LZ-NETWORK-ADMIN-KEY'].statements,
      "allow group 'id_lz_common'/'grp-lz-network-admin' to manage network-security-groups in compartment cmp-landingzone"),
  project_nsg_scope_failures: [
    env
    for env in ['prod', 'preprod']
    if !std.member(policies['PCY-LZ-%s-PROJ1-ADMIN-KEY' % std.asciiUpper(env)].statements,
      "allow group 'id_lz_common'/'grp-lz-%s-proj1-admin' to manage network-security-groups in compartment cmp-lz-%s-proj1" % [env, env]) ||
      std.length([
        statement
        for statement in policies['PCY-LZ-%s-PROJ1-ADMIN-NET-KEY' % std.asciiUpper(env)].statements
        if std.length(std.findSubstr('to manage network-security-groups', statement)) > 0
      ]) > 0
  ],
  security_admin_reads_all_lz_resources:
    std.member(policies['PCY-LZ-SECURITY-ADMIN-KEY'].statements,
      "allow group 'id_lz_common'/'grp-lz-security-admin' to read all-resources in compartment cmp-landingzone"),
  tenancy_security_admin_uses_tag_namespaces:
    std.member(policies['PCY-SECURITY-ADMIN-KEY'].statements,
      "allow group 'id_lz_common'/'grp-security-admin' to use tag-namespaces in tenancy"),
}
