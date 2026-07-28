// Multi-OE IAM requires isolated OE network/security roles while keeping peer policy budgets independent.
// contains: "mandatory_oe_groups": true
// contains: "mandatory_oe_policies": true
// contains: "shared_tags_are_isolated": true
// contains: "oe_tags_are_local": true
// contains: "oe_policy_statement_count": 68
// contains: "shared_policy_cannot_match_oe_tags": true
// contains: "oe_policy_cannot_match_peer_or_shared_tags": true
// contains: "generic_permissions_only_add_oe_network_admins": true
// contains: "common_domain_and_no_umbrella_admin": true
// contains: "peer_oe_chain_count_stable": true
local lz = import 'gen/landing_zone.libsonnet';
local policy_limits = import 'gen/lib/policy_limits.libsonnet';

local oe(name, display_name, dns, octet) = {
  [name]: {
    display_name: display_name,
    dns: dns,
    environments: {
      prod: {
        shared_project_network: {
          network: { vcn: '10.%d.64.0/21' % octet },
        },
      },
    },
  },
};

local config(operating_entities) = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: {
    kind: 'hub_a',
    network: { vcn: '10.0.0.0/21' },
  },
  operating_entities: operating_entities,
};

local two_oes =
  oe('alpha', 'OE Alpha', 'oa', 1)
  + oe('beta', 'OE Beta', 'ob', 2);
local four_oes =
  two_oes
  + oe('gamma', 'OE Gamma', 'og', 3)
  + oe('delta', 'OE Delta', 'od', 4);

local two = lz(config(two_oes)).iam;
local four = lz(config(four_oes)).iam;
local groups = two.identity_domain_groups_configuration.groups;
local policies = two.policies_configuration.supplied_policies;
local root_children = two.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children;
local alpha_children = root_children['CMP-LZ-ALPHA-KEY'].children['CMP-LZ-ALPHA-PROD-KEY'].children;
local alpha_network_policy = policies['PCY-LZ-ALPHA-NETWORK-ADMIN-KEY'];
local alpha_security_policy = policies['PCY-LZ-ALPHA-SECURITY-ADMIN-KEY'];
local shared_network_policy = policies['PCY-LZ-NETWORK-ADMIN-KEY'];
local generic_policy_text = std.manifestJsonEx(
  policies['PCY-GENERIC-ADMIN-KEY'].statements,
  '  '
);
local shared_network_policy_text = std.manifestJsonEx(shared_network_policy.statements, '  ');
local alpha_policy_text = std.manifestJsonEx(
  alpha_network_policy.statements + alpha_security_policy.statements,
  '  '
);

{
  mandatory_oe_groups:
    groups['GRP-LZ-ALPHA-NETWORK-ADMIN-KEY'].name == 'grp-lz-alpha-network-admin'
    && groups['GRP-LZ-ALPHA-SECURITY-ADMIN-KEY'].name == 'grp-lz-alpha-security-admin'
    && groups['GRP-LZ-BETA-NETWORK-ADMIN-KEY'].name == 'grp-lz-beta-network-admin'
    && groups['GRP-LZ-BETA-SECURITY-ADMIN-KEY'].name == 'grp-lz-beta-security-admin',
  mandatory_oe_policies:
    alpha_network_policy.compartment_id == 'CMP-LZ-ALPHA-KEY'
    && alpha_security_policy.compartment_id == 'CMP-LZ-ALPHA-KEY'
    && policies['PCY-LZ-BETA-NETWORK-ADMIN-KEY'].compartment_id == 'CMP-LZ-BETA-KEY'
    && policies['PCY-LZ-BETA-SECURITY-ADMIN-KEY'].compartment_id == 'CMP-LZ-BETA-KEY',
  shared_tags_are_isolated:
    root_children['CMP-LZ-NETWORK-KEY'].defined_tags['tagns-lz-role.tag-lz-role'] == 'lz-shared-network-admin'
    && root_children['CMP-LZ-SECURITY-KEY'].defined_tags['tagns-lz-role.tag-lz-role'] == 'lz-shared-security-admin',
  oe_tags_are_local:
    alpha_children['CMP-LZ-ALPHA-PROD-NETWORK-KEY'].defined_tags['tagns-lz-role.tag-lz-role'] == 'lz-network-admin'
    && alpha_children['CMP-LZ-ALPHA-PROD-SECURITY-KEY'].defined_tags['tagns-lz-role.tag-lz-role'] == 'lz-security-admin',
  oe_policy_statement_count:
    std.length(alpha_network_policy.statements) + std.length(alpha_security_policy.statements),
  alpha_network_policy_is_local:
    std.length(std.findSubstr('in compartment cmp-lz-alpha', std.manifestJsonEx(alpha_network_policy.statements, '  '))) > 0,
  shared_policy_cannot_match_oe_tags:
    std.length(std.findSubstr("('lz-shared-network-admin')", shared_network_policy_text)) > 0
    && std.length(std.findSubstr("('lz-network-admin')", shared_network_policy_text)) == 0,
  oe_policy_cannot_match_peer_or_shared_tags:
    std.length(std.findSubstr('in compartment cmp-lz-alpha', alpha_policy_text)) > 0
    && std.length(std.findSubstr('cmp-lz-beta', alpha_policy_text)) == 0
    && std.length(std.findSubstr('lz-shared-network-admin', alpha_policy_text)) == 0
    && std.length(std.findSubstr('lz-shared-security-admin', alpha_policy_text)) == 0,
  generic_permissions_only_add_oe_network_admins:
    std.length(std.findSubstr("'grp-lz-alpha-network-admin'", generic_policy_text)) > 0
    && std.length(std.findSubstr("'grp-lz-beta-network-admin'", generic_policy_text)) > 0
    && std.length(std.findSubstr("'grp-lz-alpha-security-admin'", generic_policy_text)) == 0
    && std.length(std.findSubstr("'grp-lz-beta-security-admin'", generic_policy_text)) == 0,
  common_domain_and_no_umbrella_admin:
    std.length(std.objectFields(two.identity_domains_configuration.identity_domains)) == 1
    && std.objectHas(two.identity_domains_configuration.identity_domains, 'COMMON-DOMAIN')
    && !std.objectHas(groups, 'GRP-LZ-ALPHA-ADMIN-KEY')
    && !std.objectHas(groups, 'GRP-LZ-BETA-ADMIN-KEY'),
  peer_oe_chain_count_stable:
    policy_limits.max_chain_statement_count(two) == policy_limits.max_chain_statement_count(four),
}
