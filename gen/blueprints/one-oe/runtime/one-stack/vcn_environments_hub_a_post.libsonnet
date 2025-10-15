local vcn_environments_hub_a = import './vcn_environments_hub_a.libsonnet';
local vcn_environments = import 'vcn_environments.libsonnet';

local rr = {
  'rt-vcn-fra-pp-projects': {
    description: 'Route to VCN Preprod Projects through Internal Firewall',
    destination: '10.0.128.0/21',
    destination_type: 'CIDR_BLOCK',
    network_entity_id: 'INT FW PRIVATE IP OCID',
  },
  'rt-vcn-fra-p-projects': {
    description: 'Route to VCN Prod Projects through Internal Firewall',
    destination: '10.0.64.0/21',
    destination_type: 'CIDR_BLOCK',
    network_entity_id: 'INT FW PRIVATE IP OCID',
  },
};

vcn_environments + vcn_environments_hub_a + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZP-HUB-KEY'+: {
            route_tables+: {
              'RT-00-FRA-LZP-HUB-VCN-INGRESS-KEY'+: {
                route_rules+: rr,
              },
              'RT-04-FRA-LZP-HUB-VCN-NATGW-KEY'+: {
                route_rules+: rr,
              },
            },
          },
        },
      },
    },
  },
}
