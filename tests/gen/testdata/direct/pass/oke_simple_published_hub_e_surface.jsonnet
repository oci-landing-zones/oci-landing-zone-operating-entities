// The committed simple OKE artifacts remain a one-platform Hub E quickstart.
// contains: "hub_kind": "hub_e"
// contains: "environment_names": [
// contains: "prod"
// contains: "single_cluster_count": 1
// contains: "single_worker_count": 1
// contains: "single_frontend_nsg_present": true
// contains: "multi_frontend_nsg_injected": true
// contains: "multi_hub_vcn_dependency_key": "VCN-FRA-LZ-HUB-KEY"
// contains: "governance_tags": [
// contains: "platform"
// contains: "governance_tags_are_platform_only": true
local profiles = import 'gen/workload-extensions/oke/simple/published_profiles.libsonnet';
local single_network = (import 'gen/workload-extensions/oke/simple/single-stack/oke_network.jsonnet')
  .network_configuration.network_configuration_categories;
local multi_network = (import 'gen/workload-extensions/oke/simple/multi-stack/oke_network.jsonnet')
  .network_configuration.network_configuration_categories['prod-platform-oke'];
local single_clusters = (import 'gen/workload-extensions/oke/simple/single-stack/oke_clusters.jsonnet')
  .oke_clusters_configuration.clusters;
local single_workers = (import 'gen/workload-extensions/oke/simple/single-stack/oke_workers.jsonnet')
  .oke_workers_configuration.node_pools;
local multi_governance = import 'gen/workload-extensions/oke/simple/multi-stack/oke_governance.jsonnet';
local governance_tags = [
  multi_governance.tags_configuration.namespaces['TAGNS-LZ-OKE-KEY'].tags[key].name
  for key in std.objectFields(
    multi_governance.tags_configuration.namespaces['TAGNS-LZ-OKE-KEY'].tags
  )
];

local frontend_nsg_key = 'NSG-FRA-LZ-HUB-PROD-PLATFORM-OKE-PUBLIC-LB-KEY';
local hub_vcn_key = 'VCN-FRA-LZ-HUB-KEY';

{
  hub_kind: profiles.cis1_config.hub.kind,
  environment_names: std.objectFields(profiles.cis1_config.environments),
  single_cluster_count: std.length(std.objectFields(single_clusters)),
  single_worker_count: std.length(std.objectFields(single_workers)),
  single_frontend_nsg_present:
    std.objectHas(single_network['0-shared'].vcns[hub_vcn_key].network_security_groups, frontend_nsg_key),
  multi_frontend_nsg_injected:
    std.objectHas(
      multi_network.inject_into_existing_vcns[hub_vcn_key].network_security_groups,
      frontend_nsg_key
    ),
  multi_hub_vcn_dependency_key:
    multi_network.inject_into_existing_vcns[hub_vcn_key].vcn_id,
  governance_tags: governance_tags,
  governance_tags_are_platform_only: governance_tags == ['platform'],
}
