{
  network_configuration+: {
    network_configuration_categories+: {
      shared+: {
        vcns+: {
          'VCN-FRA-LZP-HUB-KEY'+: {
            route_tables+: {
              'RT-00-FRA-LZP-HUB-VCN-INGRESS-KEY': {
                display_name: 'rt-fra-lzp-hub-ingress',
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'FW PRIVATE IP OCID',
                  },
                  'rt-vcn-fra-hub-lb-sn': {
                    description: 'Route to Public LB through FW',
                    destination: '10.0.0.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'FW PRIVATE IP OCID',
                  },
                },
              },
              'RT-01-FRA-LZP-HUB-VCN-LB-KEY': {
                display_name: 'rt-fra-lzp-hub-lb',
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through Internet GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'IGW-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-02-FRA-LZP-HUB-VCN-FW-KEY': {
                display_name: 'rt-fra-lzp-hub-fw',
                route_rules: {
                  'rt-natgw': {
                    description: 'Route to Internet through NAT GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-03-FRA-LZP-HUB-VCN-NATGW-KEY': {
                display_name: 'rt-fra-lzp-hub-natgw',
                route_rules: {
                  'rt-vcn-fra-hub-mgmt-sn': {
                    description: 'Route to mgmt subnet in Hub VCN through Firewall',
                    destination: '10.0.3.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'FW PRIVATE IP OCID',
                  },
                  'rt-vcn-fra-hub-logs-sn': {
                    description: 'Route to logs subnet in Hub VCN through Firewall',
                    destination: '10.0.4.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'FW PRIVATE IP OCID',
                  },
                  'rt-vcn-fra-hub-dns-sn': {
                    description: 'Route to dns subnet in Hub VCN through Firewall',
                    destination: '10.0.5.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'FW PRIVATE IP OCID',
                  },
                },
              },
              'RT-04-LZP-HUB-VCN-MGMT-KEY': {
                display_name: 'rt-fra-lzp-hub-mgmt',
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'FW PRIVATE IP OCID',
                  },
                  'rt-sgw': {
                    description: 'Route for sgw',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZP-HUB-KEY',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
