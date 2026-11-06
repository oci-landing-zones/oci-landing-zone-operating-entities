// Config-mode prod OKE emits one deployment with native pod networking and flattened workers.
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: { network: { vcn: '10.0.72.0/21' } },
      projects: { proj1: {} },
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
local unexpected_split_output_files = ['network_pre.json', 'oke_identity.json', 'oke_network.json', 'oke_clusters.json', 'oke_workers.json'];
local deployments = outputs['oke.json'].oke_configuration;
local cluster_key = std.objectFields(deployments)[0];
local deployment = deployments[cluster_key];
local cluster = deployment.cluster_configuration;
local node_pools = deployment.workers_configuration.worker_pools;
local node_pool_key = std.objectFields(node_pools)[0];
local node_pool = node_pools[node_pool_key];
local cluster_networking = cluster.networking;
local cluster_kubernetes_network = cluster.options.kubernetes_network_config;
local network_category =
  outputs['network.json'].network_configuration.network_configuration_categories['prod-platform-oke'];
local vcn = network_category.vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];
{
  api_endpoint_nsg_ids: cluster_networking.api_endpoint_nsg_ids,
  api_endpoint_public_flag_present: std.objectHas(cluster_networking, 'is_api_endpoint_public'),
  api_endpoint_subnet_id: cluster_networking.api_endpoint_subnet_id,
  cluster_cni_type: cluster.cni_type,
  cluster_type: cluster.cluster_type,
  cluster_key: cluster_key,
  cluster_name: cluster.name,
  kubernetes_network_config: cluster_kubernetes_network,
  worker_inherited_fields_present: [key for key in ['cis_level', 'compartment_id', 'cluster_id'] if std.objectHas(node_pool, key)],
  node_pool_key: node_pool_key,
  node_pool_name: node_pool.name,
  node_pool_cluster_tag: node_pool.freeform_tags.cluster,
  worker_subnet_id: node_pool.subnet_id,
  worker_nsg_ids: node_pool.nsg_ids,
  worker_pod_subnet_id: node_pool.pod_subnet_id,
  worker_pod_nsg_ids: node_pool.pod_nsg_ids,
  oke_subnet_keys: std.sort(std.objectFields(vcn.subnets)),
  service_lb_subnet_ids: cluster_networking.service_lb_subnet_ids,
  unexpected_split_output_files_present:
    [name for name in unexpected_split_output_files if std.objectHas(outputs, name)],
  output_files: std.sort(std.objectFields(outputs)),
  worker_os: node_pool.os,
  worker_os_version: node_pool.os_version,
  worker_shape: node_pool.shape,
  worker_size: node_pool.size,
  worker_ocpus: node_pool.ocpus,
  worker_memory: node_pool.memory,
  worker_boot_volume_size: node_pool.boot_volume_size,
  worker_volume_kms_key_id: node_pool.volume_kms_key_id,
  worker_pv_transit_encryption: node_pool.pv_transit_encryption,
}
