// Three CIS2 OKE platforms keep shared IAM statement counts fixed, use tag equality for isolation, and remain below policy limits.
// contains: "network_policy_statement_count": 6
// contains: "hub_public_policy_statement_count": 7
// contains: "tagging_policy_statement_count": 1
// contains: "frontend_nsg_count": 3
// contains: "unique_frontend_platform_tags": 3
// contains: "shared_source_allowlist_has_all_platforms": true
// contains: "shared_reconciliation_platform_tag_equality_count": 4
// contains: "hub_nsg_membership_statement_count": 1
// contains: "hub_nsg_source_platform_condition_count": 3
// contains: "public_nlb_statements": []
// contains: "platform_certificate_policy_failures": []
// contains: "below_repository_safety_budget": true
// contains: "below_oci_limit": true
local lz = import 'gen/landing_zone.libsonnet';
local policy_limits = import 'gen/lib/policy_limits.libsonnet';
local oke(vcn, services) = {
  network: { vcn: vcn },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.35.2',
      services_cidr: services,
      api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
      public_load_balancer: true,
    },
  },
};
local result = lz({
  cis_level: 2,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        okea: oke('10.0.80.0/20', '10.96.0.0/16'),
        okeb: oke('10.0.96.0/20', '10.97.0.0/16'),
        okec: oke('10.0.112.0/20', '10.98.0.0/16'),
      },
    },
  },
});
local policies = result.iam.policies_configuration.supplied_policies;
local network_policy = policies['PCY-LZ-PROD-OKE-SERVICE-NETWORK-KEY'];
local hub_policy = policies['PCY-LZ-OKE-SERVICE-PUBLIC-LB-HUB-KEY'];
local tagging_policy = policies['PCY-LZ-OKE-SERVICE-TAGGING-KEY'];
local shared_statements = network_policy.statements + hub_policy.statements + tagging_policy.statements;
local hub_nsgs = result.network.network_configuration.network_configuration_categories['0-shared']
  .vcns['VCN-FRA-LZ-HUB-KEY'].network_security_groups;
local frontend_nsgs = {
  [key]: hub_nsgs[key]
  for key in std.objectFields(hub_nsgs)
  if std.length(std.findSubstr('-PUBLIC-LB-KEY', key)) > 0
};
local max_chain = policy_limits.max_chain_statement_count(result.iam);
local tag_equality =
  'request.principal.compartment.tag.tagns-lz-oke.platform = target.resource.tag.tagns-lz-oke.platform';
local hub_nsg_membership_statements = [
  statement
  for statement in hub_policy.statements
  if std.startsWith(statement, 'allow any-user to use network-security-groups')
];
local expected_platform_policies = {
  okea: {
    compartment: 'CMP-LZ-PROD-OKEA-KEY',
    certificate: 'PCY-LZ-PROD-PLATFORM-OKEA-SERVICE-SECURITY-KEY',
  },
  okeb: {
    compartment: 'CMP-LZ-PROD-OKEB-KEY',
    certificate: 'PCY-LZ-PROD-PLATFORM-OKEB-SERVICE-SECURITY-KEY',
  },
  okec: {
    compartment: 'CMP-LZ-PROD-OKEC-KEY',
    certificate: 'PCY-LZ-PROD-PLATFORM-OKEC-SERVICE-SECURITY-KEY',
  },
};

{
  network_policy_statement_count: std.length(network_policy.statements),
  hub_public_policy_statement_count: std.length(hub_policy.statements),
  tagging_policy_statement_count: std.length(tagging_policy.statements),
  frontend_nsg_count: std.length(std.objectFields(frontend_nsgs)),
  unique_frontend_platform_tags:
    std.length(std.uniq(std.sort([
      frontend_nsgs[key].defined_tags['tagns-lz-oke.platform']
      for key in std.objectFields(frontend_nsgs)
    ]))),
  shared_source_allowlist_has_all_platforms:
    std.length([
      platform
      for platform in ['prod-okea', 'prod-okeb', 'prod-okec']
      if std.length([
        statement
        for statement in shared_statements
        if std.length(std.findSubstr("tagns-lz-oke.platform = '%s'" % platform, statement)) > 0
      ]) > 0
    ]) == 3,
  shared_reconciliation_platform_tag_equality_count:
    std.length([
      statement
      for statement in network_policy.statements + hub_policy.statements
      if std.length(std.findSubstr(tag_equality, statement)) > 0
    ]),
  hub_nsg_membership_statement_count: std.length(hub_nsg_membership_statements),
  hub_nsg_source_platform_condition_count:
    if std.length(hub_nsg_membership_statements) != 1 then 0
    else std.length([
      platform
      for platform in ['prod-okea', 'prod-okeb', 'prod-okec']
      if std.length(std.findSubstr(
        "request.principal.compartment.tag.tagns-lz-oke.platform = '%s'" % platform,
        hub_nsg_membership_statements[0]
      )) == 1
    ]),
  public_nlb_statements: [
    statement
    for statement in hub_policy.statements
    if std.length(std.findSubstr('network-load-balancers', statement)) > 0
  ],
  platform_certificate_policy_failures: [
    platform
    for platform in std.objectFields(expected_platform_policies)
    for contract in [expected_platform_policies[platform]]
    if !std.objectHas(policies, contract.certificate) ||
       policies[contract.certificate].compartment_id != contract.compartment
  ],
  below_repository_safety_budget: max_chain < 400,
  below_oci_limit: max_chain < 500,
}
