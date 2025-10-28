local vcn_environments = import 'vcn_environments.libsonnet';

local rr = {
  'rt-vcn-fra-pp-projects': {
    description: 'Route to VCN Preprod Projects through DRG',
    destination: '10.0.128.0/21',
    destination_type: 'CIDR_BLOCK',
    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
  },
  'rt-vcn-fra-p-projects': {
    description: 'Route to VCN Prod Projects through DRG',
    destination: '10.0.64.0/21',
    destination_type: 'CIDR_BLOCK',
    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
  },
};

vcn_environments + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZP-HUB-KEY'+: {
            route_tables+: {
              'RT-01-FRA-LZP-HUB-VCN-LB-KEY'+: {
                route_rules+: rr,
              },
              'RT-03-FRA-LZP-HUB-VCN-FWINT-KEY'+: {
                route_rules+: rr,
              },
              'RT-04-FRA-LZP-HUB-VCN-NATGW-KEY'+: {
                route_rules+: rr,
              },
              'RT-06-LZP-HUB-VCN-MGMT-KEY'+: {
                route_rules+: rr,
              },
            },
          },
        },
      },
    },
  },
}
