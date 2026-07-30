// Public-LB access is opt-in; Hub NSGs are membership-only while the OKE environment network retains NSG lifecycle authority.
// contains: "public_policy_present": true
// contains: "lb_statement_has_one_enabled_platform_allowlist": true
// contains: "disabled_platform_absent_from_lb_allowlist": true
// contains: "disabled_platform_absent_from_hub_nsg_allowlist": true
// contains: "frontend_nsg_present": true
// contains: "disabled_platform_frontend_nsg_present": false
// contains: "frontend_nsg_owned_by_hub_network_compartment": true
// contains: "frontend_nsg_platform_tag": "prod-oke"
// contains: "environment_nsg_platform_tags": []
// contains: "cluster_kms_key_platform_tags": []
// contains: "enabled_compartment_tags": {
// contains: "removed_compartment_tags": []
// contains: "platform_nsg_policy_present": false
// contains: "restricted_hub_nsg_membership_statement_present": true
// contains: "hub_vcn_subnet_prerequisites_present": true
// contains: "private_subnet_prerequisites_are_scope_specific": true
// contains: "environment_network_nsg_lifecycle_contract_present": true
// contains: "hub_nsg_management_statements": []
// contains: "unexpected_cluster_nsg_membership_statements": []
// contains: "load_balancer_move_excluded": true
// contains: "load_balancer_work_request_read_allowed": true
// contains: "private_network_load_balancer_work_request_read_allowed": true
// contains: "public_network_load_balancer_statements": []
// contains: "forbidden_nsg_lifecycle_or_rule_permissions": []
// contains: "forbidden_network_permissions": []
// contains: "cluster_generic_vcn_administration_statements": []
// contains: "hub_ip_statements_allow_all_clusters_without_tags": true
// contains: "unconditional_public_any_user_statements": []
// contains: "private_network_allowlists_are_scope_specific": true
// contains: "private_ip_statements_allow_all_clusters_without_tags": true
// contains: "certificate_renewal_policy_keys": []
// contains: "leaf_certificate_family_manage_present": true
// contains: "certificate_scope_is_platform_compartment": true
// contains: "certificate_policy_excludes_ca_family": true
// contains: "workload_certificate_statements": []
// contains: "platform_compartment_principal_tag_conditions": []
// contains: "platform_compartment_boundary_failures": []
// contains: "unsafe_policy_descriptions": []
local lz = import 'gen/landing_zone.libsonnet';
local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
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
              public_load_balancer: true,
            },
          },
        },
      },
    },
    preprod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.96.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.97.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
});
local policies = result.iam.policies_configuration.supplied_policies;
local public_policy_key = 'PCY-LZ-OKE-SERVICE-PUBLIC-LB-HUB-KEY';
local public_policy = policies[public_policy_key];
local public_statements = public_policy.statements;
local prod_network_statements = policies['PCY-LZ-PROD-OKE-SERVICE-NETWORK-KEY'].statements;
local preprod_network_statements = policies['PCY-LZ-PREPROD-OKE-SERVICE-NETWORK-KEY'].statements;
local security_statements = policies['PCY-LZ-PROD-PLATFORM-OKE-SERVICE-SECURITY-KEY'].statements;
local platform_network_policy_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-NETWORK-KEY';
local cluster_certificate_statements = [
  statement
  for statement in security_statements
  if std.length(std.findSubstr("request.principal.type = 'cluster'", statement)) > 0 &&
     std.length(std.findSubstr('certificate', statement)) > 0
];
local root = result.iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'];
local prod_compartment = root.children['CMP-LZ-PROD-KEY'].children['CMP-LZ-PROD-PLATFORM-KEY']
  .children['CMP-LZ-PROD-OKE-KEY'];
local preprod_compartment = root.children['CMP-LZ-PREPROD-KEY'].children['CMP-LZ-PREPROD-PLATFORM-KEY']
  .children['CMP-LZ-PREPROD-OKE-KEY'];
local hub_nsgs = result.network.network_configuration.network_configuration_categories['0-shared']
  .vcns['VCN-FRA-LZ-HUB-KEY'].network_security_groups;
local frontend_nsg = hub_nsgs['NSG-FRA-LZ-HUB-PROD-PLATFORM-OKE-PUBLIC-LB-KEY'];
local prod_network_nsgs = result.network.network_configuration.network_configuration_categories['prod-platform-oke']
  .vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'].network_security_groups;
local prod_kms_key = result.security_cis2.vaults_configuration.keys['KEY-FRA-LZ-PROD-OKE-KUBE-SECRETS-KEY'];
local required_platform_match =
  'request.principal.compartment.tag.tagns-lz-oke.platform = target.resource.tag.tagns-lz-oke.platform';
local required_enabled_platform =
  "request.principal.compartment.tag.tagns-lz-oke.platform = 'prod-oke'";
local expected_hub_nsg_membership_statement =
  "allow any-user to use network-security-groups in compartment cmp-lz-network where all { request.principal.type = 'cluster', request.principal.compartment.tag.tagns-lz-oke.platform = 'prod-oke', request.principal.compartment.tag.tagns-lz-oke.platform = target.resource.tag.tagns-lz-oke.platform }";
local hub_ip_statements = [
  s
  for s in public_statements
  if std.startsWith(s, 'allow any-user to manage public-ips') ||
     std.startsWith(s, 'allow any-user to use private-ips') ||
     std.startsWith(s, 'allow any-user to manage floating-ips')
];
local hub_lb_statements = [
  s
  for s in public_statements
  if std.startsWith(s, 'allow any-user to manage load-balancers')
];
local hub_nsg_statements = [
  s
  for s in public_statements
  if std.length(std.findSubstr('network-security-groups', s)) > 0
];
local environment_network_nsg_lifecycle_statements = [
  s
  for s in prod_network_statements
  if std.length(std.findSubstr('network-security-groups', s)) > 0 ||
     std.startsWith(s, 'allow any-user to manage vcns') ||
     std.startsWith(s, 'allow any-user to read vcns')
];
local all_policy_statements = [
  statement
  for key in std.objectFields(policies)
  for statement in policies[key].statements
];
local platform_service_policy_keys = [
  key
  for key in std.objectFields(policies)
  if std.length(std.findSubstr('-PLATFORM-', key)) > 0 &&
     std.length(std.findSubstr('-SERVICE-', key)) > 0
];
local platform_service_any_user_statements = [
  statement
  for key in platform_service_policy_keys
  for statement in policies[key].statements
  if std.startsWith(statement, 'allow any-user ')
];

{
  public_policy_present: std.objectHas(policies, public_policy_key),
  lb_statement_has_one_enabled_platform_allowlist:
    std.length([
      s
      for s in hub_lb_statements
      if std.length(std.findSubstr(required_enabled_platform, s)) == 1
    ]) == 1,
  disabled_platform_absent_from_lb_allowlist:
    std.length([s for s in hub_lb_statements if std.length(std.findSubstr("'preprod-oke'", s)) > 0]) == 0,
  disabled_platform_absent_from_hub_nsg_allowlist:
    std.length([s for s in hub_nsg_statements if std.length(std.findSubstr("'preprod-oke'", s)) > 0]) == 0,
  frontend_nsg_present:
    std.objectHas(hub_nsgs, 'NSG-FRA-LZ-HUB-PROD-PLATFORM-OKE-PUBLIC-LB-KEY'),
  disabled_platform_frontend_nsg_present:
    std.objectHas(hub_nsgs, 'NSG-FRA-LZ-HUB-PREPROD-PLATFORM-OKE-PUBLIC-LB-KEY'),
  frontend_nsg_owned_by_hub_network_compartment:
    frontend_nsg.compartment_id == 'CMP-LZ-NETWORK-KEY',
  frontend_nsg_platform_tag: frontend_nsg.defined_tags['tagns-lz-oke.platform'],
  environment_nsg_platform_tags: [
    key
    for key in std.objectFields(prod_network_nsgs)
    if std.objectHas(prod_network_nsgs[key], 'defined_tags') &&
       std.objectHas(prod_network_nsgs[key].defined_tags, 'tagns-lz-oke.platform')
  ],
  cluster_kms_key_platform_tags: [
    tag
    for tag in if std.objectHas(prod_kms_key, 'defined_tags') then std.objectFields(prod_kms_key.defined_tags) else []
    if tag == 'tagns-lz-oke.platform'
  ],
  enabled_compartment_tags: prod_compartment.defined_tags,
  removed_compartment_tags: [
    tag
    for tag in ['tagns-lz-oke.managed-by', 'tagns-lz-oke.network-scope', 'tagns-lz-oke.public-load-balancer']
    if std.objectHas(prod_compartment.defined_tags, tag) || std.objectHas(preprod_compartment.defined_tags, tag)
  ],
  platform_nsg_policy_present: std.objectHas(policies, platform_network_policy_key),
  restricted_hub_nsg_membership_statement_present:
    hub_nsg_statements == [expected_hub_nsg_membership_statement],
  hub_vcn_subnet_prerequisites_present:
    std.length([
      s
      for s in public_statements
      if (std.startsWith(s, 'allow any-user to use subnets') ||
          std.startsWith(s, 'allow any-user to read vcns')) &&
         std.length(std.findSubstr(required_enabled_platform, s)) > 0 &&
         std.length(std.findSubstr('target.resource.tag.', s)) == 0
    ]) == 2,
  private_subnet_prerequisites_are_scope_specific:
    std.length([
      s
      for s in prod_network_statements
      if std.startsWith(s, 'allow any-user to use subnets') &&
         std.length(std.findSubstr("'prod-oke'", s)) == 1 &&
         std.length(std.findSubstr("'preprod-oke'", s)) == 0
    ]) == 1 &&
    std.length([
      s
      for s in preprod_network_statements
      if std.startsWith(s, 'allow any-user to use subnets') &&
         std.length(std.findSubstr("'preprod-oke'", s)) == 1 &&
         std.length(std.findSubstr("'prod-oke'", s)) == 0
    ]) == 1,
  environment_network_nsg_lifecycle_contract_present:
    std.length(environment_network_nsg_lifecycle_statements) == 3 &&
    std.length([
      statement
      for statement in environment_network_nsg_lifecycle_statements
      if std.startsWith(statement, 'allow any-user to manage network-security-groups') &&
         std.length(std.findSubstr('tagns-lz-oke.platform', statement)) == 0 &&
         std.length(std.findSubstr("request.permission != 'NETWORK_SECURITY_GROUP_MOVE'", statement)) == 1
    ]) == 1 &&
    std.length([
      statement
      for statement in environment_network_nsg_lifecycle_statements
      if std.startsWith(statement, 'allow any-user to manage vcns') &&
         std.length(std.findSubstr('tagns-lz-oke.platform', statement)) == 0 &&
         std.length(std.findSubstr("request.operation = 'CreateNetworkSecurityGroup'", statement)) == 1 &&
         std.length(std.findSubstr("request.operation = 'DeleteNetworkSecurityGroup'", statement)) == 1
    ]) == 1,
  hub_nsg_management_statements: [
    statement
    for statement in public_statements
    if std.startsWith(statement, 'allow any-user to manage network-security-groups') ||
       std.startsWith(statement, 'allow any-user to manage vcns')
  ],
  unexpected_cluster_nsg_membership_statements: [
    statement
    for key in std.objectFields(policies)
    for statement in policies[key].statements
    if std.startsWith(statement, 'allow any-user to use network-security-groups') &&
       (key != public_policy_key || statement != expected_hub_nsg_membership_statement)
  ],
  load_balancer_move_excluded:
    std.length([s for s in public_statements if std.length(std.findSubstr("request.permission != 'LOAD_BALANCER_MOVE'", s)) > 0]) == 1,
  load_balancer_work_request_read_allowed:
    std.length([s for s in public_statements if std.length(std.findSubstr("request.permission = 'LOAD_BALANCER_READ'", s)) > 0]) == 1 &&
    std.length([s for s in prod_network_statements if std.length(std.findSubstr("request.permission = 'LOAD_BALANCER_READ'", s)) > 0]) == 1,
  private_network_load_balancer_work_request_read_allowed:
    std.length([s for s in public_statements if std.length(std.findSubstr("request.permission = 'NETWORK_LOAD_BALANCER_READ'", s)) > 0]) == 0 &&
    std.length([s for s in prod_network_statements if std.length(std.findSubstr("request.permission = 'NETWORK_LOAD_BALANCER_READ'", s)) > 0]) == 1,
  public_network_load_balancer_statements: [
    s
    for s in public_statements
    if std.length(std.findSubstr('network-load-balancers', s)) > 0 ||
       std.length(std.findSubstr('NETWORK_LOAD_BALANCER_', s)) > 0
  ],
  forbidden_nsg_lifecycle_or_rule_permissions: [
    permission
    for permission in [
      'NETWORK_SECURITY_GROUP_CREATE',
      'NETWORK_SECURITY_GROUP_UPDATE',
      'NETWORK_SECURITY_GROUP_DELETE',
      'NETWORK_SECURITY_GROUP_MOVE',
      'NETWORK_SECURITY_GROUP_UPDATE_SECURITY_RULES',
    ]
    if std.length([s for s in public_statements if std.length(std.findSubstr("request.permission = '%s'" % permission, s)) > 0]) > 0
  ],
  forbidden_network_permissions: [
    forbidden
    for forbidden in [
      'manage virtual-network-family',
      'manage vcns',
      'manage network-load-balancers',
      "request.permission = 'NETWORK_LOAD_BALANCER_MOVE'",
    ]
    if std.length([s for s in public_statements if std.length(std.findSubstr(forbidden, s)) > 0]) > 0
  ],
  cluster_generic_vcn_administration_statements: [
    statement
    for statement in all_policy_statements
    if std.startsWith(statement, 'allow any-user ') &&
       std.length(std.findSubstr('virtual-network-family', statement)) > 0
  ],
  hub_ip_statements_allow_all_clusters_without_tags:
    std.length(hub_ip_statements) == 3 &&
    std.length([
      s
      for s in hub_ip_statements
      if std.length(std.findSubstr("request.principal.type = 'cluster'", s)) > 0 &&
         std.length(std.findSubstr('request.principal.compartment.tag.', s)) == 0 &&
         std.length(std.findSubstr('target.resource.tag.', s)) == 0
    ]) == 3,
  unconditional_public_any_user_statements: [
    s
    for s in public_statements
    if std.startsWith(s, 'allow any-user ') && std.length(std.findSubstr(' where ', s)) == 0
  ],
  private_network_allowlists_are_scope_specific:
    std.length([s for s in prod_network_statements if std.length(std.findSubstr("'prod-oke'", s)) > 0]) == 3 &&
    std.length([s for s in prod_network_statements if std.length(std.findSubstr("'preprod-oke'", s)) > 0]) == 0 &&
    std.length([s for s in preprod_network_statements if std.length(std.findSubstr("'preprod-oke'", s)) > 0]) == 3 &&
    std.length([s for s in preprod_network_statements if std.length(std.findSubstr("'prod-oke'", s)) > 0]) == 0,
  private_ip_statements_allow_all_clusters_without_tags:
    std.length([
      statement
      for statement in prod_network_statements + preprod_network_statements
      if std.startsWith(statement, 'allow any-user to use private-ips') &&
         std.length(std.findSubstr("request.principal.type = 'cluster'", statement)) > 0 &&
         std.length(std.findSubstr('tagns-lz-oke.platform', statement)) == 0
    ]) == 2,
  certificate_renewal_policy_keys: [
    key
    for key in std.objectFields(policies)
    if std.length(std.findSubstr('CERTIFICATE-RENEWAL', key)) > 0
  ],
  leaf_certificate_family_manage_present:
    std.length([
      statement
      for statement in cluster_certificate_statements
      if std.length(std.findSubstr('manage leaf-certificate-family', statement)) > 0
    ]) == 1,
  certificate_scope_is_platform_compartment:
    std.length(cluster_certificate_statements) == 1 &&
    std.length(std.findSubstr('in compartment cmp-lz-prod-oke', cluster_certificate_statements[0])) > 0,
  certificate_policy_excludes_ca_family:
    std.length([s for s in cluster_certificate_statements if std.length(std.findSubstr('certificate-authority-family', s)) > 0]) == 0,
  workload_certificate_statements: [
    statement
    for statement in all_policy_statements
    if std.length(std.findSubstr("request.principal.type = 'workload'", statement)) > 0 &&
       std.length(std.findSubstr('certificate', statement)) > 0
  ],
  platform_compartment_principal_tag_conditions: [
    statement
    for statement in platform_service_any_user_statements
    if std.length(std.findSubstr('request.principal.compartment.tag.', statement)) > 0
  ],
  platform_compartment_boundary_failures: [
    statement
    for statement in platform_service_any_user_statements
    if std.length(std.findSubstr('request.principal.compartment.id = target.compartment.id', statement)) == 0 &&
       std.length(std.findSubstr('manage leaf-certificate-family', statement)) == 0
  ],
  unsafe_policy_descriptions: [
    key
    for key in std.objectFields(policies)
    if std.startsWith(policies[key].description, 'Unsafe:')
  ],
}
