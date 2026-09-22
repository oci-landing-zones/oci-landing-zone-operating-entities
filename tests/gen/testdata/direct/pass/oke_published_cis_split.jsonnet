// Committed OKE IAM is rendered from CIS2 while every other published artifact remains on the CIS1 profile.
// contains: "single_iam_kms_statement_count": 3
// contains: "multi_iam_kms_statement_count": 3
// contains: "single_cluster_cis_levels": [
// contains: "1"
// contains: "single_worker_cis_levels": [
// contains: "single_cluster_kms_references": []
// contains: "single_worker_kms_references": []
// contains: "multi_cluster_kms_references": []
// contains: "multi_worker_kms_references": []
// contains: "published_security_oke_keys": []
// contains: "single_non_iam_outputs_match_cis1_render": true
// contains: "multi_cluster_worker_outputs_match_cis1_render": true
local lz = import 'gen/landing_zone.libsonnet';
local profiles = import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet';
local cis1 = lz(profiles.cis1_config);
local single_identity = import 'gen/workload-extensions/oke/simple/single-stack/oke_identity.jsonnet';
local multi_identity = import 'gen/workload-extensions/oke/simple/multi-stack/oke_identity.jsonnet';
local single_network = import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet';
local single_governance = import 'gen/workload-extensions/oke/simple/single-stack/oke_governance.jsonnet';
local single_security_cis1 = import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis1.jsonnet';
local single_security_cis2 = import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis2.jsonnet';
local single_observability_cis1 = import 'gen/workload-extensions/oke/simple/single-stack/oke_observability_cis1.jsonnet';
local single_observability_cis2 = import 'gen/workload-extensions/oke/simple/single-stack/oke_observability_cis2.jsonnet';
local single_clusters = (import 'gen/workload-extensions/oke/simple/single-stack/oke_clusters.jsonnet')
  .oke_clusters_configuration.clusters;
local single_workers = (import 'gen/workload-extensions/oke/simple/single-stack/oke_workers.jsonnet')
  .oke_workers_configuration.node_pools;
local multi_clusters = (import 'gen/workload-extensions/oke/simple/multi-stack/oke_clusters.jsonnet')
  .oke_clusters_configuration.clusters;
local multi_workers = (import 'gen/workload-extensions/oke/simple/multi-stack/oke_workers.jsonnet')
  .oke_workers_configuration.node_pools;
local published_security = import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis2.jsonnet';
local security_policy_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-SECURITY-KEY';
local kms_statement_count(identity) =
  std.length([
    statement
    for statement in identity.policies_configuration.supplied_policies[security_policy_key].statements
    if std.length(std.findSubstr(' keys ', statement)) > 0 ||
       std.length(std.findSubstr(' key-delegate', statement)) > 0
  ]);
local cluster_kms_references(clusters) = [
  key
  for key in std.objectFields(clusters)
  if std.objectHas(clusters[key], 'encryption')
];
local worker_kms_references(workers) = [
  key
  for key in std.objectFields(workers)
  if std.objectHas(workers[key].node_config_details, 'encryption') &&
     std.objectHas(workers[key].node_config_details.encryption, 'kms_key_id')
];

{
  single_iam_kms_statement_count: kms_statement_count(single_identity),
  multi_iam_kms_statement_count: kms_statement_count(multi_identity),
  single_cluster_cis_levels: std.uniq(std.sort([
    single_clusters[key].cis_level
    for key in std.objectFields(single_clusters)
  ])),
  single_worker_cis_levels: std.uniq(std.sort([
    single_workers[key].cis_level
    for key in std.objectFields(single_workers)
  ])),
  single_cluster_kms_references: cluster_kms_references(single_clusters),
  single_worker_kms_references: worker_kms_references(single_workers),
  multi_cluster_kms_references: cluster_kms_references(multi_clusters),
  multi_worker_kms_references: worker_kms_references(multi_workers),
  published_security_oke_keys: [
    key
    for key in
      if std.objectHas(published_security, 'vaults_configuration') &&
         std.objectHas(published_security.vaults_configuration, 'keys')
      then std.objectFields(published_security.vaults_configuration.keys)
      else []
    if std.length(std.findSubstr('-OKE-KUBE-SECRETS-KEY', key)) > 0
  ],
  single_non_iam_outputs_match_cis1_render:
    single_network == cis1.network &&
    single_governance == cis1.governance &&
    single_security_cis1 == cis1.security_cis1 &&
    single_security_cis2 == cis1.security_cis2 &&
    single_observability_cis1 == cis1.observability_cis1 &&
    single_observability_cis2 == cis1.observability_cis2 &&
    single_clusters == cis1.extra.oke_clusters.oke_clusters_configuration.clusters &&
    single_workers == cis1.extra.oke_workers.oke_workers_configuration.node_pools,
  multi_cluster_worker_outputs_match_cis1_render:
    multi_clusters == cis1.extra.oke_clusters.oke_clusters_configuration.clusters &&
    multi_workers == cis1.extra.oke_workers.oke_workers_configuration.node_pools,
}
