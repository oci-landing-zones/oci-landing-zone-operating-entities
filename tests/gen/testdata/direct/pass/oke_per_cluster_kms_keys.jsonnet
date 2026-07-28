// CIS2 OKE clusters use one generated platform-compartment key and the same key configuration reference in cluster and worker inputs.
// contains: "shared_security_vault_present": true
// contains: "key_contract_failures": []
// contains: "platforms_missing_kms_authorization": []
// contains: "unexpected_service_oke_key_delegate_grants": []
// contains: "kms_source_boundary_failures": []
// contains: "unexpected_oke_volume_key_grants": []
// contains: "baseline_blockstorage_key_use_present": true
// contains: "forbidden_kms_authorization": []
// contains: "unauthorized_key_management_statements": []
// contains: "shared_security_kms_policy_present": false
// contains: "worker_encrypt_in_transit_failures": []
local lz = import 'gen/landing_zone.libsonnet';
local oke(vcn, services) = {
  network: { vcn: vcn },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.35.2',
      services_cidr: services,
      api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
    },
  },
};
local result = lz({
  cis_level: 2,
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: { platforms: { oke: oke('10.0.80.0/20', '10.96.0.0/16') } },
    preprod: { platforms: { oke: oke('10.0.96.0/20', '10.97.0.0/16') } },
  },
});
local clusters = result.extra.oke_clusters.oke_clusters_configuration.clusters;
local workers = result.extra.oke_workers.oke_workers_configuration.node_pools;
local vaults = result.security_cis2.vaults_configuration;
local policies = result.iam.policies_configuration.supplied_policies;
local expected = {
  prod: {
    key: 'KEY-FRA-LZ-PROD-OKE-KUBE-SECRETS-KEY',
    compartment: 'CMP-LZ-PROD-OKE-KEY',
    compartment_name: 'cmp-lz-prod-oke',
    cluster: 'CLR-FRA-LZ-PROD-OKE-KEY',
    worker: 'NDP-FRA-LZ-PROD-OKE-KEY',
    policy: 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-SECURITY-KEY',
  },
  preprod: {
    key: 'KEY-FRA-LZ-PREPROD-OKE-KUBE-SECRETS-KEY',
    compartment: 'CMP-LZ-PREPROD-OKE-KEY',
    compartment_name: 'cmp-lz-preprod-oke',
    cluster: 'CLR-FRA-LZ-PREPROD-OKE-KEY',
    worker: 'NDP-FRA-LZ-PREPROD-OKE-KEY',
    policy: 'PCY-LZ-PREPROD-PLATFORM-OKE-SERVICE-SECURITY-KEY',
  },
};
local kms_statements(env) = [
  statement
  for statement in policies[expected[env].policy].statements
  if std.length(std.findSubstr(' keys ', statement)) > 0 ||
     std.length(std.findSubstr(' key-delegate', statement)) > 0
];
local all_kms_statements = [
  statement
  for env in std.objectFields(expected)
  for statement in kms_statements(env)
];

{
  shared_security_vault_present:
    vaults.default_compartment_id == 'CMP-LZ-SECURITY-KEY' &&
    std.objectHas(vaults.vaults, 'VLT-LZ-SHARED-SECURITY-KEY'),
  key_contract_failures: [
    env
    for env in std.objectFields(expected)
    if vaults.keys[expected[env].key].compartment_id != expected[env].compartment ||
       vaults.keys[expected[env].key].vault_key != 'VLT-LZ-SHARED-SECURITY-KEY' ||
       clusters[expected[env].cluster].encryption.kube_secret_kms_key_id != expected[env].key ||
       workers[expected[env].worker].node_config_details.encryption.kms_key_id != expected[env].key
  ],
  worker_encrypt_in_transit_failures: [
    env
    for env in std.objectFields(expected)
    if workers[expected[env].worker].node_config_details.encryption.enable_encrypt_in_transit != true
  ],
  platforms_missing_kms_authorization: [
    env
    for env in std.objectFields(expected)
    if std.length(kms_statements(env)) == 0
  ],
  kms_source_boundary_failures: [
    statement
    for env in std.objectFields(expected)
    for statement in kms_statements(env)
    if std.length(std.findSubstr('compartment %s' % expected[env].compartment_name, statement)) == 0 ||
       ((std.length(std.findSubstr("request.principal.type = 'cluster'", statement)) > 0 ||
         std.length(std.findSubstr("request.principal.type = 'nodepool'", statement)) > 0) &&
        std.length(std.findSubstr(
          'request.principal.compartment.id = target.compartment.id',
          statement
        )) == 0)
  ],
  unexpected_service_oke_key_delegate_grants: [
    statement
    for statement in all_kms_statements
    if std.startsWith(statement, 'allow service oke to use key-delegates ')
  ],
  unexpected_oke_volume_key_grants: [
    statement
    for statement in all_kms_statements
    if (std.length(std.findSubstr(' key-delegate ', statement)) > 0 &&
        std.length(std.findSubstr("request.principal.type = 'cluster'", statement)) > 0) ||
       std.startsWith(statement, 'allow service blockstorage to use keys')
  ],
  baseline_blockstorage_key_use_present:
    std.length([
      statement
      for policy in std.objectFields(policies)
      for statement in policies[policy].statements
      if std.startsWith(statement, 'allow service blockstorage,') &&
         std.length(std.findSubstr(' to use keys in tenancy', statement)) > 0
    ]) == 1,
  forbidden_kms_authorization: [
    statement
    for statement in all_kms_statements
    if std.length(std.findSubstr('target.key.id', statement)) > 0 ||
       std.length(std.findSubstr('target.resource.tag.', statement)) > 0 ||
       std.length(std.findSubstr('target.key.tag.', statement)) > 0 ||
       std.length(std.findSubstr('ocid1.key', std.asciiLower(statement))) > 0 ||
       std.length(std.findSubstr('key_ocid', std.asciiLower(statement))) > 0
  ],
  unauthorized_key_management_statements: [
    statement
    for statement in all_kms_statements
    if std.length(std.findSubstr(' to manage keys ', statement)) > 0 &&
       std.length(std.findSubstr("group 'id_lz_common'/'grp-lz-security-admin'", statement)) == 0
  ],
  shared_security_kms_policy_present:
    std.objectHas(policies, 'PCY-LZ-OKE-SERVICE-SECURITY-KEY'),
}
