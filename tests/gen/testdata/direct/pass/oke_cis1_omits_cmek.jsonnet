// CIS1 OKE with public load balancing disabled omits KMS, certificate, and Hub-public-LB resources and policies.
// contains: "key_permission_statements": []
// contains: "certificate_permission_statements": []
// contains: "shared_security_policy_present": false
// contains: "cis1_vaults_configuration_present": false
// contains: "cis2_oke_key_resources": []
// contains: "security_policy_keys": []
// contains: "public_hub_policy_present": false
// contains: "public_hub_network_rules": []
// contains: "worker_encryption_present": {
// contains: false
local lz = import 'gen/landing_zone.libsonnet';
local result = lz({
  cis_level: 1,
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
            },
          },
        },
      },
    },
  },
});
local clusters = result.extra.oke_clusters.oke_clusters_configuration.clusters;
local workers = result.extra.oke_workers.oke_workers_configuration.node_pools;
local policies = result.iam.policies_configuration.supplied_policies;
local security_policy_keys = [
  key
  for key in std.objectFields(policies)
  if std.length(std.findSubstr('-PLATFORM-OKE-SERVICE-SECURITY-KEY', key)) > 0
];
local key_statements = [
  statement
  for key in security_policy_keys
  for statement in policies[key].statements
  if std.length(std.findSubstr(' keys ', statement)) > 0 ||
     std.length(std.findSubstr(' key-delegate', statement)) > 0
];
local prod_category = result.network.network_configuration.network_configuration_categories['prod-platform-oke'];
local prod_vcn = prod_category.vcns[std.objectFields(prod_category.vcns)[0]];
local worker_nsg_key = [
  key
  for key in std.objectFields(prod_vcn.network_security_groups)
  if std.length(std.findSubstr('-WORKERS-KEY', key)) > 0
][0];
local worker_nsg = prod_vcn.network_security_groups[worker_nsg_key];

{
  cluster_cis_levels: {
    [key]: clusters[key].cis_level
    for key in std.objectFields(clusters)
  },
  cluster_encryption_present: {
    [key]: std.objectHas(clusters[key], 'encryption')
    for key in std.objectFields(clusters)
  },
  worker_cis_levels: {
    [key]: workers[key].cis_level
    for key in std.objectFields(workers)
  },
  worker_encryption_present: {
    [key]: std.objectHas(workers[key].node_config_details, 'encryption')
    for key in std.objectFields(workers)
  },
  worker_kms_key_present: {
    [key]:
      std.objectHas(workers[key].node_config_details, 'encryption') &&
      std.objectHas(workers[key].node_config_details.encryption, 'kms_key_id')
    for key in std.objectFields(workers)
  },
  cis1_vaults_configuration_present:
    std.objectHas(result.security_cis1, 'vaults_configuration'),
  cis2_oke_key_resources: [
    key
    for key in
      if std.objectHas(result.security_cis2, 'vaults_configuration') &&
         std.objectHas(result.security_cis2.vaults_configuration, 'keys')
      then std.objectFields(result.security_cis2.vaults_configuration.keys)
      else []
    if std.length(std.findSubstr('-OKE-KUBE-SECRETS-KEY', key)) > 0
  ],
  security_policy_keys: security_policy_keys,
  public_hub_policy_present:
    std.objectHas(policies, 'PCY-LZ-OKE-SERVICE-PUBLIC-LB-HUB-KEY'),
  shared_security_policy_present: std.objectHas(policies, 'PCY-LZ-OKE-SERVICE-SECURITY-KEY'),
  key_permission_statements: key_statements,
  certificate_permission_statements: [
    statement
    for key in std.objectFields(policies)
    for statement in if std.objectHas(policies[key], 'statements') then policies[key].statements else []
    if std.length(std.findSubstr('certificate', statement)) > 0
  ],
  public_hub_network_rules: [
    key
    for direction in ['egress_rules', 'ingress_rules']
    for key in std.objectFields(worker_nsg[direction])
    if std.startsWith(key, 'hub_public_lb')
  ],
}
