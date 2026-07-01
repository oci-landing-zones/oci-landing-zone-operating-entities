// published simple OKE profiles stay anchored to the Hub E quickstart shape
local defaults = import 'gen/defaults.libsonnet';
local published_profiles = import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet';
local single = (import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet')
  .network_configuration.network_configuration_categories;
local multi = (import 'gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet')
  .network_configuration.network_configuration_categories;
local clusters = (import 'gen/workload-extensions/oke/simple/single-stack/oke_clusters.jsonnet')
  .oke_clusters_configuration.clusters;
local workers = (import 'gen/workload-extensions/oke/simple/single-stack/oke_workers.jsonnet')
  .oke_workers_configuration.node_pools;
local identity = (import 'gen/workload-extensions/oke/simple/single-stack/oke_identity.jsonnet')
  .policies_configuration.supplied_policies;
local single_security_cis1 = import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis1.jsonnet';
local single_security_cis2 = import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis2.jsonnet';
local multi_security_cis1 = import 'gen/workload-extensions/oke/simple/multi-stack/oke_security_cis1.jsonnet';
local multi_security_cis2 = import 'gen/workload-extensions/oke/simple/multi-stack/oke_security_cis2.jsonnet';

local hub = single['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
local hub_gateways = single['0-shared'].non_vcn_specific_gateways;
local oke = single['prod-platform-oke'].vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];
local multi_oke = multi['prod-platform-oke'];
local generic_project_vcns = [
  'VCN-FRA-LZ-PROD-PROJECTS-KEY',
  'VCN-FRA-LZ-PREPROD-PROJECTS-KEY',
];
local profile_config = published_profiles.hub_e_prod_oke_config;
local service_network_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-NETWORK-KEY';
local service_network_hub_key = 'PCY-LZ-OKE-SERVICE-NETWORK-HUB-KEY';
local service_compute_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-COMPUTE-KEY';
local service_security_key = 'PCY-LZ-OKE-SERVICE-SECURITY-KEY';
local service_storage_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-STORAGE-KEY';
local old_service_storage_keys_key = 'PCY-LZ-OKE-SERVICE-STORAGE-KEYS-KEY';
local service_tagging_key = 'PCY-LZ-OKE-SERVICE-TAGGING-KEY';
local old_vcn_cni_key = 'PCY-LZ-PROD-PLATFORM-OKE-VCN-CNI-KEY';
local network_statements = identity[service_network_key].statements;
local network_hub_statements = identity[service_network_hub_key].statements;
local compute_statements = identity[service_compute_key].statements;
local security_statements = identity[service_security_key].statements;
local storage_statements = identity[service_storage_key].statements;
local tagging_statements = identity[service_tagging_key].statements;
local all_service_statements =
  network_statements + network_hub_statements + compute_statements +
  security_statements + storage_statements + tagging_statements;
local oke_vault_key = 'VLT-LZ-SHARED-SECURITY-KEY';
local kube_secret_key = 'KEY-FRA-LZ-PROD-OKE-KUBE-SECRETS-KEY';
local cluster = clusters['CLR-FRA-LZ-PROD-OKE-KEY'];
local worker = workers['NDP-FRA-LZ-PROD-OKE-KEY'];

{
  profile_config: {
    hub_kind: profile_config.hub.kind,
    environments: std.objectFields(profile_config.environments),
    has_shared_project_network:
      std.objectHas(profile_config.environments.prod, 'shared_project_network'),
    has_projects:
      std.objectHas(profile_config.environments.prod, 'projects'),
  },
  ordinary_hub_e_default_keeps_project_vcns: {
    prod: std.objectHas(defaults.hub_e.environments.prod, 'shared_project_network'),
    preprod: std.objectHas(defaults.hub_e.environments.preprod, 'shared_project_network'),
  },
  single_stack: {
    categories: std.objectFields(single),
    generic_project_vcns_present: [
      vcn_key
      for vcn_key in generic_project_vcns
      if std.length([
        category
        for category in std.objectFields(single)
        if std.objectHas(single[category], 'vcns') &&
           std.objectHas(single[category].vcns, vcn_key)
      ]) > 0
    ],
    hub_subnets: std.objectFields(hub.subnets),
    hub_has_firewall_subnets: std.length([
      key
      for key in std.objectFields(hub.subnets)
      if std.length(std.findSubstr('FW', key)) > 0 ||
         std.length(std.findSubstr('UNTRUST', key)) > 0 ||
         std.length(std.findSubstr('TRUST', key)) > 0
    ]) > 0,
    hub_l7_load_balancers_present: std.objectHas(hub_gateways, 'l7_load_balancers'),
    hub_lb_subnet_present: std.objectHas(hub.subnets, 'SN-FRA-LZ-HUB-LB-KEY'),
    hub_lb_nsg_present: std.objectHas(hub.network_security_groups, 'NSG-FRA-LZ-HUB-LB-KEY'),
    oke_vcn_cidr: oke.cidr_blocks,
    cluster_keys: std.objectFields(clusters),
    worker_keys: std.objectFields(workers),
  },
  multi_stack: {
    categories: std.objectFields(multi),
    vcn_keys: std.objectFields(multi_oke.vcns),
    injected_drgs:
      std.objectFields(multi_oke.non_vcn_specific_gateways.inject_into_existing_drgs),
    drg_route_table_key:
      multi_oke.non_vcn_specific_gateways.inject_into_existing_drgs['DRG-FRA-LZ-HUB-KEY']
        .drg_attachments['DRGATT-FRA-LZ-PROD-PLATFORM-OKE-KEY'].drg_route_table_key,
    security_cis1_vault_keys: std.objectFields(multi_security_cis1.vaults_configuration.vaults),
    security_cis1_key_keys: std.objectFields(multi_security_cis1.vaults_configuration.keys),
    security_cis2_vault_keys: std.objectFields(multi_security_cis2.vaults_configuration.vaults),
    security_cis2_key_keys: std.objectFields(multi_security_cis2.vaults_configuration.keys),
  },
  oke_encryption: {
    cluster_key_reference: cluster.encryption.kube_secret_kms_key_id,
    worker_image: worker.node_config_details.image,
    worker_boot_volume_encryption: worker.node_config_details.encryption,
    cis1_vault_present: std.objectHas(single_security_cis1.vaults_configuration.vaults, oke_vault_key),
    cis1_key_present: std.objectHas(single_security_cis1.vaults_configuration.keys, kube_secret_key),
    cis1_key_has_service_grantees:
      std.objectHas(single_security_cis1.vaults_configuration.keys[kube_secret_key], 'service_grantees'),
    cis2_shared_vault_present: std.objectHas(single_security_cis2.vaults_configuration.vaults, oke_vault_key),
    cis2_oke_key_present: std.objectHas(single_security_cis2.vaults_configuration.keys, kube_secret_key),
    cis2_audit_vault_preserved:
      std.objectHas(single_security_cis2.vaults_configuration.vaults, 'VLT-LZ-SHARED-SECURITY-KEY'),
    cis2_audit_key_preserved:
      std.objectHas(single_security_cis2.vaults_configuration.keys, 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY'),
  },
  oke_service_policies: {
    old_vcn_cni_policy_present: std.objectHas(identity, old_vcn_cni_key),
    network_policy: {
      key_present: std.objectHas(identity, service_network_key),
      compartment_id: identity[service_network_key].compartment_id,
      statements: network_statements,
    },
    network_hub_policy: {
      key_present: std.objectHas(identity, service_network_hub_key),
      compartment_id: identity[service_network_hub_key].compartment_id,
      statements: network_hub_statements,
    },
    compute_policy: {
      key_present: std.objectHas(identity, service_compute_key),
      compartment_id: identity[service_compute_key].compartment_id,
      statements: compute_statements,
    },
    security_policy: {
      key_present: std.objectHas(identity, service_security_key),
      compartment_id: identity[service_security_key].compartment_id,
      statements: security_statements,
      plural_key_delegate_statements: [
        statement
        for statement in security_statements
        if std.length(std.findSubstr('key-delegates', statement)) > 0
      ],
      target_key_id_statements: [
        statement
        for statement in security_statements
        if std.length(std.findSubstr('target.key.id', statement)) > 0
      ],
      blockstorage_key_statements: [
        statement
        for statement in security_statements
        if std.length(std.findSubstr('allow service blockstorage to use keys', statement)) > 0
      ],
    },
    storage_policy: {
      key_present: std.objectHas(identity, service_storage_key),
      compartment_id: identity[service_storage_key].compartment_id,
      statements: storage_statements,
    },
    old_storage_keys_policy_present: std.objectHas(identity, old_service_storage_keys_key),
    tagging_policy: {
      key_present: std.objectHas(identity, service_tagging_key),
      compartment_id: identity[service_tagging_key].compartment_id,
      statements: tagging_statements,
      singular_tag_namespace_statements: [
        statement
        for statement in tagging_statements
        if std.length(std.findSubstr(' tag-namespace ', statement)) > 0
      ],
      lz_role_namespace_constrained:
        std.length([
          statement
          for statement in tagging_statements
          if std.length(std.findSubstr("target.tag-namespace.name = 'tagns-lz-role'", statement)) > 0
        ]) == std.length(tagging_statements),
    },
    forbidden_broad_grants_present: [
      statement
      for statement in [
        "allow any-user to manage instances in tenancy where all { request.principal.type = 'cluster'}",
        "allow any-user to use private-ips in tenancy where all { request.principal.type = 'cluster'}",
        "allow any-user to use network-security-groups in tenancy where all { request.principal.type = 'cluster'}",
        "allow any-user to read instance-images in tenancy where all { request.principal.type = 'cluster' }",
      ]
      if std.member(all_service_statements, statement)
    ],
    virtual_network_family_grants_present: [
      statement
      for statement in all_service_statements
      if std.length(std.findSubstr('virtual-network-family', statement)) > 0
    ],
  },
}
