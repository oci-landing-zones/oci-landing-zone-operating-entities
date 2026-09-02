// Shared and dedicated project subnets render their documented network shapes.
local lz = import 'gen/landing_zone.libsonnet';

local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: {
        network: {
          vcn: '10.0.64.0/21',
          subnets: { frontend: '10.0.64.0/24' },
        },
      },
      projects: {
        api: { subnets: { jobs: '10.0.68.0/26' } },
        data: {},
      },
    },
    dev: {
      project_network: {
        network: { vcn: '10.0.112.0/21', subnets: {} },
      },
    },
    test: {
      project_network: {
        network: { vcn: '10.0.120.0/21' },
      },
    },
  },
});

local categories = result.network.network_configuration.network_configuration_categories;
local prod_vcn = categories['1-prod'].vcns['VCN-FRA-LZ-PROD-PROJECTS-KEY'];
local dev_vcn = categories['2-dev'].vcns['VCN-FRA-LZ-DEV-PROJECTS-KEY'];
local test_vcn = categories['3-test'].vcns['VCN-FRA-LZ-TEST-PROJECTS-KEY'];
local dedicated = prod_vcn.subnets['SN-FRA-LZ-PROD-API-JOBS-KEY'];

{
  dedicated_subnet_cidr: dedicated.cidr_block,
  dedicated_subnet_display_name: dedicated.display_name,
  dedicated_subnet_is_untagged: !std.objectHas(dedicated, 'defined_tags'),
  empty_shared_map_emits_no_subnets: std.length(std.objectFields(dev_vcn.subnets)) == 0,
  omitted_shared_map_emits_defaults: std.objectFields(test_vcn.subnets) == [
    'SN-FRA-LZ-TEST-APP-KEY',
    'SN-FRA-LZ-TEST-DB-KEY',
    'SN-FRA-LZ-TEST-INFRA-KEY',
    'SN-FRA-LZ-TEST-WEB-KEY',
  ],
  explicit_shared_map_is_exact: std.objectFields(prod_vcn.subnets) == [
    'SN-FRA-LZ-PROD-API-JOBS-KEY',
    'SN-FRA-LZ-PROD-FRONTEND-KEY',
  ],
  default_vcn_routing_has_no_hub_override: !std.objectHas(
    test_vcn.route_tables['RT-FRA-LZ-TEST-PROJ-GENERIC-KEY'].route_rules,
    'rr-fra-project-inspection'
  ),
}
