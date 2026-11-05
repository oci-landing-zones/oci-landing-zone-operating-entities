// Bastion access is opt-in and uses the existing administration groups.
// contains: "passed": true
local lz = import 'gen/landing_zone.libsonnet';
local base = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: { projects: { app: {} } },
    preprod: { projects: { app: {} } },
  },
  shared_platforms: {
    custom: { network: { vcn: '10.0.64.0/21', subnets: { mgmt: '10.0.64.0/24' } } },
  },
};
local disabled = lz(base).iam;
local enabled = lz(base { bastion: { client_cidr_block_allow_list: ['203.0.113.10/32'] } }).iam;
local policies(iam) = iam.policies_configuration.supplied_policies;
local has(text, fragment) = std.length(std.findSubstr(fragment, text)) > 0;
local bastion_statements(iam) = [
  statement
  for policy in std.objectValues(policies(iam))
  for statement in policy.statements
  if has(statement, ' bastion')
];
local allows(group, permission) = std.length([
  statement
  for statement in bastion_statements(enabled)
  if has(statement, "'id_lz_common'/'%s'" % group)
     && has(statement, 'to %s in compartment cmp-landingzone:cmp-lz-security' % permission)
]) > 0;
local users = ['grp-lz-network-admin', 'grp-lz-prod-app-admin', 'grp-lz-preprod-app-admin'];
assert bastion_statements(disabled) == [] : 'Disabled Bastion must not grant service or session access';
assert std.objectFields(disabled.identity_domain_groups_configuration.groups)
       == std.objectFields(enabled.identity_domain_groups_configuration.groups) : 'Bastion must reuse existing groups';
assert allows('grp-lz-security-admin', 'manage bastion-family') : 'Security administrators manage the shared Bastion';
assert std.foldl(function(ok, group) ok && allows(group, 'use bastion') && allows(group, 'manage bastion-session'), users, true) :
       'Network and project administrators need shared Bastion sessions';
assert std.foldl(function(ok, group) ok && !allows(group, 'manage bastion-family') && !allows(group, 'manage bastion'), users, true) :
       'Session users must not receive Bastion administration';
assert std.length([
  key
  for key in std.objectFields(policies(enabled))
  if std.length([s for s in policies(enabled)[key].statements if has(s, ' bastion')]) > 0
     && !std.member(['CMP-LANDINGZONE-KEY', 'TENANCY-ROOT'], policies(enabled)[key].compartment_id)
]) == 0 : 'Shared security grants must be attached above the target compartment';
assert std.length([s for s in bastion_statements(enabled) if !has(s, 'in compartment cmp-landingzone:cmp-lz-security')]) == 0 :
       'Bastion permissions must stay in shared security';
assert std.member(disabled.policies_configuration.supplied_policies['PCY-AUDITING-ADMIN-KEY'].statements,
                  "allow group 'id_lz_common'/'grp-auditors-admin' to inspect all-resources in tenancy") :
       'Read-only audit visibility stays available';
{ passed: true }
