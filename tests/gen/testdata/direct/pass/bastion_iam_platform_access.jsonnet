// Bastion sessions use emitted platform administrators, excluding RBAC and service identities.
// contains: "passed": true
local lz = import 'gen/landing_zone.libsonnet';
local exacc = import 'gen/workload-extensions/exacc/single-stack/profiles.libsonnet';
local exacs = import 'gen/workload-extensions/exacs/single-stack/profiles.libsonnet';
local ocvs = import 'gen/workload-extensions/ocvs/profiles.libsonnet';
local oke = import 'gen/workload-extensions/oke/simple/single-stack/profiles.libsonnet';
local bastion = { client_cidr_block_allow_list: ['203.0.113.10/32'] };
local two_exacc_platforms = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      projects: { proj1: {}, proj2: {} },
      platforms: {
        ['exacc' + project]: {
          extension: {
            type: 'exacc',
            params: {
              project_db_compartments: [project],
              notification_emails: { default: ['platform@example.com'] },
            },
          },
        }
        for project in ['proj1', 'proj2']
      },
    },
  },
};
local exadb_users(product, shared) =
  (if shared then ['grp-lz-global-%s-infra-admin' % product, 'grp-lz-global-%s-db-admin' % product] else
     ['grp-lz-%s-%s-%s-admin' % [env, product, role] for env in ['prod', 'preprod'] for role in ['infra', 'db']])
  + ['grp-lz-%s-proj1-%s-admin' % [env, product] for env in ['prod', 'preprod']];
local cases = [
  { config: oke.single_stack.iam_cis2_config, users: ['grp-lz-prod-oke-admins'] },
  { config: ocvs.prod_hub_e.config, users: ['grp-lz-prod-ocvs-admins'] },
  { config: exacc.single_stack.uc1_config, users: exadb_users('exacc', true) },
  { config: exacc.single_stack.uc2_config, users: ['grp-lz-global-exacc-infra-admin'] + exadb_users('exacc', false) },
  { config: exacc.single_stack.uc3_config, users: exadb_users('exacc', false) },
  { config: exacs.uc1.config, users: exadb_users('exacs', true) },
  { config: exacs.uc2.config, users: ['grp-lz-global-exacs-infra-admin'] + exadb_users('exacs', false) },
  { config: exacs.uc3.config, users: exadb_users('exacs', false) },
  {
    config: two_exacc_platforms,
    users: ['grp-lz-prod-exacc-infra-admin', 'grp-lz-prod-exacc-db-admin', 'grp-lz-prod-proj1-exacc-admin', 'grp-lz-prod-proj2-exacc-admin'],
  },
];
local has(text, fragment) = std.length(std.findSubstr(fragment, text)) > 0;
local statements(iam) = [
  statement
  for policy in std.objectValues(iam.policies_configuration.supplied_policies)
  for statement in policy.statements
  if has(statement, ' bastion')
];
local results = [
  local disabled = statements(lz(case.config).iam);
  local iam = lz(case.config { bastion: bastion }).iam;
  local access = statements(iam);
  local allows(group, verb) = std.length([
    statement
    for statement in access
    if has(statement, "'id_lz_common'/'%s'" % group)
       && has(statement, 'to %s in compartment cmp-landingzone:cmp-lz-security' % verb)
  ]) > 0;
  assert disabled == [] : 'Platform defaults must not grant Bastion access';
  assert std.foldl(function(ok, group) ok && allows(group, 'use bastion') && allows(group, 'manage bastion-session'), case.users, true) :
         'Every emitted platform administrator needs shared Bastion session access';
  assert std.foldl(function(ok, group) ok && !allows(group, 'manage bastion-family') && !allows(group, 'manage bastion'), case.users, true) :
         'Platform session users must not receive Bastion administration';
  assert std.length([
    statement
    for statement in access
    if has(statement, 'rbac-') || has(statement, 'any-user') || has(statement, 'dynamic-group') || has(statement, 'allow service ')
  ]) == 0 : 'Bastion must not grant RBAC-only or service identities access';
  assert std.length([
    policy
    for policy in std.objectValues(iam.policies_configuration.supplied_policies)
    if std.length([s for s in policy.statements if has(s, ' bastion')]) > 0
       && !std.member(['CMP-LANDINGZONE-KEY', 'TENANCY-ROOT'], policy.compartment_id)
  ]) == 0 : 'Platform access to shared security needs a parent-attached policy';
  true
  for case in cases
];
assert std.foldl(function(ok, result) ok && result, results, true);
{ passed: true }
