// contains: "verified": true
local lz = import 'gen/landing_zone.libsonnet';
local profiles = import 'gen/workload-extensions/oke/simple/single-stack/profiles.libsonnet';
local exacc = import 'gen/workload-extensions/exacc/single-stack/profiles.libsonnet';
local exacs = import 'gen/workload-extensions/exacs/single-stack/profiles.libsonnet';
local ocvs = import 'gen/workload-extensions/ocvs/profiles.libsonnet';
local base = { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } }, environments: { prod: {} } };
local domain = 'customer.domain-01';
local check(config) =
  local result = lz(config + { identity_domain_name: domain, bastion: { client_cidr_block_allow_list: ['203.0.113.10/32'] } });
  local iam = result.iam;
  local statements = std.flattenArrays([policy.statements for policy in std.objectValues(iam.policies_configuration.supplied_policies)]);
  assert iam.identity_domains_configuration.identity_domains['COMMON-DOMAIN'].display_name == domain;
  assert iam.identity_domain_groups_configuration.default_identity_domain_id == 'COMMON-DOMAIN';
  assert std.foldl(function(ok, statement) ok && !std.startsWith(statement, "allow group 'id_lz_common'/"), statements, true);
  assert std.foldl(function(ok, statement) ok || std.startsWith(statement, "allow group '%s'/" % domain), statements, false);
  assert result.security_cis2.vaults_configuration.keys['KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY'].group_grantees == ["'%s'/'grp-lz-security-admin'" % domain];
  true;
assert std.foldl(function(ok, config) ok && check(config), [base, profiles.single_stack.iam_cis2_config, exacc.single_stack.uc1_config, exacs.uc1.config, ocvs.prod_hub_e.config], true);
assert lz(base).iam.identity_domains_configuration.identity_domains['COMMON-DOMAIN'].display_name == 'id_lz_common';
{ verified: true }
