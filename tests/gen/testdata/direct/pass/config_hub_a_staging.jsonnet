// hub A staged outputs keep pre-network categories, backend placeholders, and drg priorities stable
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
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
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.144.0/20' },
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
local network_pre = outputs['network_pre.json'];
local network = outputs['network.json'];
local pre_categories = network_pre.network_configuration.network_configuration_categories;
local statements =
  pre_categories['0-shared'].non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY']
    .drg_route_distributions['DRGRD-FRA-LZ-HUB-KEY'].statements;
local hub_vcn = pre_categories['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
local clusters = outputs['oke_clusters.json'].oke_clusters_configuration.clusters;
local node_pools = outputs['oke_workers.json'].oke_workers_configuration.node_pools;
{
  pre_categories: std.sort(std.objectFields(pre_categories)),
  final_categories: std.sort(std.objectFields(network.network_configuration.network_configuration_categories)),
  cluster_compartment_ids: {
    prod: clusters['CLR-FRA-LZ-PROD-OKE-KEY'].compartment_id,
    preprod: clusters['CLR-FRA-LZ-PREPROD-OKE-KEY'].compartment_id,
  },
  hub_l7_load_balancers_present:
    std.objectHas(pre_categories['0-shared'].non_vcn_specific_gateways, 'l7_load_balancers'),
  hub_lb_subnet_present: std.objectHas(hub_vcn.subnets, 'SN-FRA-LZ-HUB-LB-KEY'),
  hub_lb_nsg_present: std.objectHas(hub_vcn.network_security_groups, 'NSG-FRA-LZ-HUB-LB-KEY'),
  node_pool_compartment_ids: {
    prod: node_pools['NDP-FRA-LZ-PROD-OKE-KEY'].compartment_id,
    preprod: node_pools['NDP-FRA-LZ-PREPROD-OKE-KEY'].compartment_id,
  },
  route_statement_priorities: {
    prod: statements['ROUTE-TO-VCN-PROD-KEY'].priority,
    preprod: statements['ROUTE-TO-VCN-PREPROD-KEY'].priority,
    prod_oke: statements['ROUTE-TO-VCN-PROD-PLATFORM-OKE-KEY'].priority,
    preprod_oke: statements['ROUTE-TO-VCN-PREPROD-PLATFORM-OKE-KEY'].priority,
  },
}
