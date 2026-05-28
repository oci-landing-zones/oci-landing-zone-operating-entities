// config-mode prod OKE emits generic landing-zone files plus OKE cluster and worker outputs, without separate split-output files
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              pods_cidr: '10.244.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
});
local unexpected_split_output_files = ['network_pre.json', 'oke_identity.json', 'oke_network.json'];
local clusters = outputs['oke_clusters.json'].oke_clusters_configuration.clusters;
local cluster_key = std.objectFields(clusters)[0];
local cluster = clusters[cluster_key];
local node_pools = outputs['oke_workers.json'].oke_workers_configuration.node_pools;
local node_pool_key = std.objectFields(node_pools)[0];
local node_pool = node_pools[node_pool_key];
local cluster_networking = cluster.networking;
local cluster_kubernetes_network = cluster.options.kubernetes_network_config;
local node_pool_networking = node_pool.networking;
local network_category =
  outputs['network.json'].network_configuration.network_configuration_categories['prod-platform-oke'];
local vcn = network_category.vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];
{
  api_endpoint_nsg_ids: cluster_networking.api_endpoint_nsg_ids,
  api_endpoint_public: cluster_networking.is_api_endpoint_public,
  api_endpoint_subnet_id: cluster_networking.api_endpoint_subnet_id,
  cluster_cni_type: cluster.cni_type,
  cluster_key: cluster_key,
  cluster_name: cluster.name,
  kubernetes_network_config: cluster_kubernetes_network,
  node_pool_cluster_id: node_pool.cluster_id,
  node_pool_key: node_pool_key,
  node_pool_name: node_pool.name,
  node_pool_cluster_tag: node_pool.freeform_tags.cluster,
  node_pool_networking: node_pool_networking,
  oke_subnet_keys: std.sort(std.objectFields(vcn.subnets)),
  services_subnet_id: cluster_networking.services_subnet_id,
  unexpected_split_output_files_present:
    [name for name in unexpected_split_output_files if std.objectHas(outputs, name)],
  output_files: std.sort(std.objectFields(outputs)),
  worker_image: node_pool.node_config_details.image,
}
