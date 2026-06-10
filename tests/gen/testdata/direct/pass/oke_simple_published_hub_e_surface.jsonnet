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

local hub = single['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
local hub_gateways = single['0-shared'].non_vcn_specific_gateways;
local oke = single['preprod-platform-oke'].vcns['VCN-FRA-LZ-PREPROD-PLATFORM-OKE-KEY'];
local multi_oke = multi['preprod-platform-oke'];
local generic_project_vcns = [
  'VCN-FRA-LZ-PROD-PROJECTS-KEY',
  'VCN-FRA-LZ-PREPROD-PROJECTS-KEY',
];
local profile_configs = {
  hub_a: published_profiles.hub_a_preprod_oke_config,
  hub_b: published_profiles.hub_b_preprod_oke_config,
  hub_c: published_profiles.hub_c_preprod_oke_config,
  hub_e: published_profiles.hub_e_preprod_oke_config,
};
local profile_envs_without_generic_projects = {
  [hub_kind]: {
    environments: std.objectFields(profile_configs[hub_kind].environments),
    has_shared_project_network:
      std.objectHas(profile_configs[hub_kind].environments.preprod, 'shared_project_network'),
    has_projects:
      std.objectHas(profile_configs[hub_kind].environments.preprod, 'projects'),
  }
  for hub_kind in std.objectFields(profile_configs)
};

{
  profile_configs: profile_envs_without_generic_projects,
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
        .drg_attachments['DRGATT-FRA-LZ-PREPROD-PLATFORM-OKE-KEY'].drg_route_table_key,
  },
}
