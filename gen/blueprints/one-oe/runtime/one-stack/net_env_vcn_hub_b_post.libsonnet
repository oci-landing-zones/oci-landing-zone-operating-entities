local hub = import './net_env_vcn_hub_b.libsonnet';
local env_vcn = import 'net_env_vcn.libsonnet';

local rr = {
  'rt-vcn-fra-pp-projects': {
    description: 'Route to VCN Preprod Projects through Firewall',
    destination: '10.0.128.0/21',
    destination_type: 'CIDR_BLOCK',
    network_entity_id: 'FW PRIVATE IP OCID',
  },
  'rt-vcn-fra-p-projects': {
    description: 'Route to VCN Prod Projects through Firewall',
    destination: '10.0.64.0/21',
    destination_type: 'CIDR_BLOCK',
    network_entity_id: 'FW PRIVATE IP OCID',
  },
};

env_vcn + hub + {
  network_configuration+: {
    network_configuration_categories+: {
      shared+: {
        vcns+: {
          'VCN-FRA-LZP-HUB-KEY'+: {
            route_tables+: {
              'RT-01-FRA-LZP-HUB-VCN-LB-KEY'+: {
                route_rules+: rr,
              },
              'RT-00-FRA-LZP-HUB-VCN-INGRESS-KEY'+: {
                route_rules+: rr,
              },
              'RT-03-FRA-LZP-HUB-VCN-NATGW-KEY'+: {
                route_rules+: rr,
              },
            },
          },
        },
      },
    },
  },
}
