// Multi-OE OKE keeps identical prod/oke platform names collision-free across operating entities.
// contains: "alpha_cluster_key": "CLR-FRA-LZ-ALPHA-PROD-OKE-KEY"
// contains: "beta_cluster_key": "CLR-FRA-LZ-BETA-PROD-OKE-KEY"
// contains: "alpha_vcn_dns": "vcnfralzalpoke"
// contains: "beta_vcn_dns": "vcnfralzbepoke"
local landing_zone = import 'gen/landing_zone.libsonnet';

local oke_platform(vcn, services_cidr) = {
  network: { vcn: vcn },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.35.2',
      services_cidr: services_cidr,
      api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
    },
  },
};

local result = landing_zone({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: { platforms: { oke: oke_platform('10.2.0.0/20', '10.96.0.0/16') } },
      },
    },
    beta: {
      display_name: 'Beta',
      dns: 'be',
      environments: {
        prod: { platforms: { oke: oke_platform('10.3.0.0/20', '10.97.0.0/16') } },
      },
    },
  },
});

local categories = result.network.network_configuration.network_configuration_categories;
local alpha_vcn = categories['alpha-prod-platform-oke'].vcns[
  'VCN-FRA-LZ-ALPHA-PROD-PLATFORM-OKE-KEY'
];
local beta_vcn = categories['beta-prod-platform-oke'].vcns[
  'VCN-FRA-LZ-BETA-PROD-PLATFORM-OKE-KEY'
];
local clusters = result.extra.oke_clusters.oke_clusters_configuration.clusters;
local workers = result.extra.oke_workers.oke_workers_configuration.node_pools;
local alpha_cluster_key = 'CLR-FRA-LZ-ALPHA-PROD-OKE-KEY';
local beta_cluster_key = 'CLR-FRA-LZ-BETA-PROD-OKE-KEY';
local alpha_worker_key = 'NDP-FRA-LZ-ALPHA-PROD-OKE-KEY';
local beta_worker_key = 'NDP-FRA-LZ-BETA-PROD-OKE-KEY';

assert std.objectHas(clusters, alpha_cluster_key);
assert std.objectHas(clusters, beta_cluster_key);
assert std.objectHas(workers, alpha_worker_key);
assert std.objectHas(workers, beta_worker_key);
assert workers[alpha_worker_key].cluster_id == alpha_cluster_key;
assert workers[beta_worker_key].cluster_id == beta_cluster_key;
assert clusters[alpha_cluster_key].compartment_id == 'CMP-LZ-ALPHA-PROD-OKE-KEY';
assert clusters[beta_cluster_key].compartment_id == 'CMP-LZ-BETA-PROD-OKE-KEY';
assert clusters[alpha_cluster_key].networking.api_endpoint_subnet_id ==
       'SN-FRA-LZ-ALPHA-PROD-PLATFORM-OKE-CP-KEY';
assert clusters[beta_cluster_key].networking.api_endpoint_subnet_id ==
       'SN-FRA-LZ-BETA-PROD-PLATFORM-OKE-CP-KEY';
assert alpha_vcn.dns_label != beta_vcn.dns_label;

{
  alpha_cluster_key: alpha_cluster_key,
  beta_cluster_key: beta_cluster_key,
  alpha_worker_key: alpha_worker_key,
  beta_worker_key: beta_worker_key,
  alpha_vcn_dns: alpha_vcn.dns_label,
  beta_vcn_dns: beta_vcn.dns_label,
}
