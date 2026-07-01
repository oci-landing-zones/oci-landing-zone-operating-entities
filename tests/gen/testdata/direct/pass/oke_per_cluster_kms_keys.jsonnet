// Multiple OKE platforms share the security Vault and receive unique encryption keys.
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
local clusters = result.extra.oke_clusters.oke_clusters_configuration.clusters;
local workers = result.extra.oke_workers.oke_workers_configuration.node_pools;
local cis1_vaults = result.security_cis1.vaults_configuration;
local cis2_vaults = result.security_cis2.vaults_configuration;
local identity = result.iam.policies_configuration.supplied_policies;
local security_policy_keys = [
  key
  for key in std.objectFields(identity)
  if key == 'PCY-LZ-OKE-SERVICE-SECURITY-KEY'
];
local hub_network_policy_keys = [
  key
  for key in std.objectFields(identity)
  if key == 'PCY-LZ-OKE-SERVICE-NETWORK-HUB-KEY'
];
local storage_policy_keys = [
  key
  for key in std.objectFields(identity)
  if std.length(std.findSubstr('-PLATFORM-OKE-SERVICE-STORAGE-KEY', key)) > 0
];
local security_statements = [
  statement
  for key in security_policy_keys
  for statement in identity[key].statements
];

{
  cluster_key_references: {
    [key]: clusters[key].encryption.kube_secret_kms_key_id
    for key in std.objectFields(clusters)
  },
  worker_encryption: {
    [key]: workers[key].node_config_details.encryption
    for key in std.objectFields(workers)
  },
  cis1: {
    default_compartment_id: cis1_vaults.default_compartment_id,
    vault_keys: std.objectFields(cis1_vaults.vaults),
    key_keys: std.objectFields(cis1_vaults.keys),
    key_vault_references: {
      [key]: cis1_vaults.keys[key].vault_key
      for key in std.objectFields(cis1_vaults.keys)
    },
  },
  cis2: {
    shared_security_vault_present: std.objectHas(cis2_vaults.vaults, 'VLT-LZ-SHARED-SECURITY-KEY'),
    prod_key_present: std.objectHas(cis2_vaults.keys, 'KEY-FRA-LZ-PROD-OKE-KUBE-SECRETS-KEY'),
    preprod_key_present: std.objectHas(cis2_vaults.keys, 'KEY-FRA-LZ-PREPROD-OKE-KUBE-SECRETS-KEY'),
    audit_key_preserved: std.objectHas(cis2_vaults.keys, 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY'),
  },
  security_policies: {
    keys: security_policy_keys,
    compartments: {
      [key]: identity[key].compartment_id
      for key in security_policy_keys
    },
    statements_outside_security_compartment: [
      statement
      for statement in security_statements
      if std.length(std.findSubstr('compartment cmp-lz-security', statement)) == 0
    ],
    target_key_id_statements: [
      statement
      for statement in security_statements
      if std.length(std.findSubstr('target.key.id', statement)) > 0
    ],
    certificate_authority_statements: [
      statement
      for statement in security_statements
      if std.length(std.findSubstr('manage certificate-authority-family', statement)) > 0
    ],
    blockstorage_key_statements: [
      statement
      for statement in security_statements
      if std.length(std.findSubstr('allow service blockstorage to use keys', statement)) > 0
    ],
  },
  hub_network_policies: {
    keys: hub_network_policy_keys,
    compartments: {
      [key]: identity[key].compartment_id
      for key in hub_network_policy_keys
    },
    statements: {
      [key]: identity[key].statements
      for key in hub_network_policy_keys
    },
  },
  storage_policies: {
    keys: storage_policy_keys,
    compartments: {
      [key]: identity[key].compartment_id
      for key in storage_policy_keys
    },
    statements: {
      [key]: identity[key].statements
      for key in storage_policy_keys
    },
    old_shared_keys_policy_present: std.objectHas(identity, 'PCY-LZ-OKE-SERVICE-STORAGE-KEYS-KEY'),
  },
}
