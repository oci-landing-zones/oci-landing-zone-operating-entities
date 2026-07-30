// Disabling public_load_balancer removes Hub-public-LB, certificate-consumption, and Hub-network-rule grants while preserving CIS2 KMS.
// contains: "public_hub_policy_present": false
// contains: "certificate_consumption_statements": []
// contains: "platform_kms_statement_count": 3
// contains: "public_hub_network_rules": []
// contains: "public_frontend_nsgs": []
// contains: "platform_nsg_policy_present": false
// contains: "environment_network_nsg_management_statement_count": 1
// contains: "hub_nsg_management_statements": []
// contains: "cluster_nsg_membership_statements": []
local lz = import 'gen/landing_zone.libsonnet';
local result = lz({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              public_load_balancer: false,
            },
          },
        },
      },
    },
  },
});
local policies = result.iam.policies_configuration.supplied_policies;
local security_policy = policies['PCY-LZ-PROD-PLATFORM-OKE-SERVICE-SECURITY-KEY'];
local platform_nsg_policy_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-NETWORK-KEY';
local kms_statements = [
  statement
  for statement in security_policy.statements
  if std.length(std.findSubstr(' keys ', statement)) > 0 ||
     std.length(std.findSubstr(' key-delegate', statement)) > 0
];
local prod_vcn = result.network.network_configuration.network_configuration_categories['prod-platform-oke']
  .vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];
local worker_nsg = prod_vcn.network_security_groups['NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY'];
local hub_nsgs = result.network.network_configuration.network_configuration_categories['0-shared']
  .vcns['VCN-FRA-LZ-HUB-KEY'].network_security_groups;

{
  public_hub_policy_present:
    std.objectHas(policies, 'PCY-LZ-OKE-SERVICE-PUBLIC-LB-HUB-KEY'),
  certificate_consumption_statements: [
    statement
    for statement in security_policy.statements
    if std.length(std.findSubstr('certificate', statement)) > 0
  ],
  platform_kms_statement_count: std.length(kms_statements),
  public_hub_network_rules: [
    key
    for direction in ['egress_rules', 'ingress_rules']
    for key in std.objectFields(worker_nsg[direction])
    if std.startsWith(key, 'hub_public_lb')
  ],
  public_frontend_nsgs: [
    key
    for key in std.objectFields(hub_nsgs)
    if std.length(std.findSubstr('PLATFORM-OKE-PUBLIC-LB', key)) > 0
  ],
  platform_nsg_policy_present: std.objectHas(policies, platform_nsg_policy_key),
  environment_network_nsg_management_statement_count: std.length([
    statement
    for key in std.objectFields(policies)
    for statement in policies[key].statements
    if std.startsWith(statement, 'allow any-user to manage network-security-groups')
  ]),
  hub_nsg_management_statements: [
    statement
    for key in std.objectFields(policies)
    for statement in policies[key].statements
    if policies[key].compartment_id == 'CMP-LZ-NETWORK-KEY' &&
       std.startsWith(statement, 'allow any-user to manage network-security-groups')
  ],
  cluster_nsg_membership_statements: [
    statement
    for key in std.objectFields(policies)
    for statement in policies[key].statements
    if std.startsWith(statement, 'allow any-user to use network-security-groups')
  ],
}
