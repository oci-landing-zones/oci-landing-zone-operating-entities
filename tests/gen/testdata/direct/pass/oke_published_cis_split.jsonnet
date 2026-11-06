// Committed OKE IAM is rendered from CIS2 while every other published artifact remains on the CIS1 profile.
// contains: "single_iam_kms_statement_count": 3
// contains: "multi_iam_kms_statement_count": 3
// contains: "single_cluster_cis_levels": [
// contains: "1"
// contains: "worker_inherited_field_failures": []
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
local single_oke = (import 'gen/workload-extensions/oke/simple/single-stack/oke.jsonnet').oke_configuration;
local multi_oke = (import 'gen/workload-extensions/oke/simple/multi-stack/oke.jsonnet').oke_configuration;
local published_security = import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis2.jsonnet';
local security_policy_key = 'PCY-LZ-PROD-PLATFORM-OKE-SERVICE-SECURITY-KEY';
local kms_statement_count(identity) =
  std.length([
    statement
    for statement in identity.policies_configuration.supplied_policies[security_policy_key].statements
    if std.length(std.findSubstr(' keys ', statement)) > 0 ||
       std.length(std.findSubstr(' key-delegate', statement)) > 0
  ]);
local cluster_kms_references(deployments) = [
  key
  for key in std.objectFields(deployments)
  if std.objectHas(deployments[key].cluster_configuration, 'encryption')
];
local worker_kms_references(deployments) = [
  pool_key
  for deployment in std.objectValues(deployments)
  for pool_key in std.objectFields(deployment.workers_configuration.worker_pools)
  if std.objectHas(deployment.workers_configuration.worker_pools[pool_key], 'volume_kms_key_id')
];

{
  single_iam_kms_statement_count: kms_statement_count(single_identity),
  multi_iam_kms_statement_count: kms_statement_count(multi_identity),
  single_cluster_cis_levels: std.uniq(std.sort([
    deployment.cluster_configuration.cis_level
    for deployment in std.objectValues(single_oke)
  ])),
  worker_inherited_field_failures: [
    { worker: pool_key, field: field }
    for deployments in [single_oke, multi_oke]
    for deployment in std.objectValues(deployments)
    for pool_key in std.objectFields(deployment.workers_configuration.worker_pools)
    for field in ['cis_level', 'compartment_id', 'cluster_id']
    if std.objectHas(deployment.workers_configuration.worker_pools[pool_key], field)
  ],
  single_cluster_kms_references: cluster_kms_references(single_oke),
  single_worker_kms_references: worker_kms_references(single_oke),
  multi_cluster_kms_references: cluster_kms_references(multi_oke),
  multi_worker_kms_references: worker_kms_references(multi_oke),
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
    single_oke == cis1.extra.oke.oke_configuration,
  multi_cluster_worker_outputs_match_cis1_render:
    multi_oke == cis1.extra.oke.oke_configuration,
}
