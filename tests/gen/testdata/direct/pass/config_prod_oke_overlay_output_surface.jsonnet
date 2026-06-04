// config-mode prod OKE overlay emits flannel-compatible cluster and worker outputs without pod network resources
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
              cni_type: 'overlay',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
});
local clusters = outputs['oke_clusters.json'].oke_clusters_configuration.clusters;
local cluster_key = std.objectFields(clusters)[0];
local cluster = clusters[cluster_key];
local node_pools = outputs['oke_workers.json'].oke_workers_configuration.node_pools;
local node_pool_key = std.objectFields(node_pools)[0];
local node_pool = node_pools[node_pool_key];
local network_category =
  outputs['network.json'].network_configuration.network_configuration_categories['prod-platform-oke'];
local vcn = network_category.vcns['VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'];
local pod_nsg_key = 'NSG-FRA-LZ-PROD-PLATFORM-OKE-PODS-KEY';
local nsg_rules(nsg) =
  [nsg.egress_rules[key] for key in std.objectFields(nsg.egress_rules)] +
  [nsg.ingress_rules[key] for key in std.objectFields(nsg.ingress_rules)];
local rule_references_pods(rule) =
  (std.objectHas(rule, 'src') && rule.src == pod_nsg_key) ||
  (std.objectHas(rule, 'dst') && rule.dst == pod_nsg_key);
{
  cluster_cni_type: cluster.cni_type,
  kubernetes_network_config: cluster.options.kubernetes_network_config,
  node_pool_networking: node_pool.networking,
  oke_subnet_keys: std.sort(std.objectFields(vcn.subnets)),
  oke_route_table_keys: std.sort(std.objectFields(vcn.route_tables)),
  oke_security_list_keys: std.sort(std.objectFields(vcn.security_lists)),
  oke_nsg_keys: std.sort(std.objectFields(vcn.network_security_groups)),
  pod_nsg_reference_count: std.length([
    rule
    for nsg_key in std.objectFields(vcn.network_security_groups)
    for rule in nsg_rules(vcn.network_security_groups[nsg_key])
    if rule_references_pods(rule)
  ]),
  worker_nsg_rule_keys: {
    egress: std.sort(std.objectFields(vcn.network_security_groups['NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY'].egress_rules)),
    ingress: std.sort(std.objectFields(vcn.network_security_groups['NSG-FRA-LZ-PROD-PLATFORM-OKE-WORKERS-KEY'].ingress_rules)),
  },
}
