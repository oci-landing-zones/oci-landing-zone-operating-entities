{
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZP-HUB-KEY'+: {
            route_tables+: {
              'RT-00-FRA-LZP-HUB-VCN-INGRESS-KEY': {
                display_name: 'rt-fra-lzp-hub-ingress',
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the Internal Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'INT FW PRIVATE IP OCID',
                  },
                },
              },
              'RT-01-FRA-LZP-HUB-VCN-LB-KEY': {
                display_name: 'rt-fra-lzp-hub-lb',
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the DMZ Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'DMZ FW PRIVATE IP OCID',
                  },
                },
              },
              'RT-02-FRA-LZP-HUB-VCN-FWDMZ-KEY': {
                display_name: 'rt-fra-lzp-hub-dmz',
                route_rules: {
                  'rt-igw': {
                    description: 'Route to Internet through DMZ FW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'IGW-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-03-FRA-LZP-HUB-VCN-FWINT-KEY': {
                display_name: 'rt-fra-lzp-hub-internal',
                route_rules: {
                  'rt-natgw': {
                    description: 'Route to Internet through Private FW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-04-FRA-LZP-HUB-VCN-NATGW-KEY': {
                display_name: 'rt-fra-lzp-hub-natgw',
                route_rules: {
                  'rt-vcn-fra-hub-mgmt-sn': {
                    description: 'Route to mgmt subnet in Hub VCN through Internal Firewall',
                    destination: '10.0.3.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'INT FW PRIVATE IP OCID',
                  },
                  'rt-vcn-fra-hub-logs-sn': {
                    description: 'Route to logs subnet in Hub VCN through Internal Firewall',
                    destination: '10.0.4.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'INT FW PRIVATE IP OCID',
                  },
                  'rt-vcn-fra-hub-dns-sn': {
                    description: 'Route to dns subnet in Hub VCN through Internal Firewall',
                    destination: '10.0.5.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'INT FW PRIVATE IP OCID',
                  },
                },
              },
              'RT-05-FRA-LZP-HUB-VCN-IGW-KEY': {
                display_name: 'rt-fra-lzp-hub-igw',
                route_rules: {
                  'rt-vcn-fra-hub-lb-sn': {
                    description: 'Route to lb subnet in Hub VCN through DMZ Firewall',
                    destination: '10.0.1.0/24',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'DMZ FW PRIVATE IP OCID',
                  },
                },
              },
              'RT-06-LZP-HUB-VCN-MGMT-KEY': {
                display_name: 'rt-fra-lzp-hub-mgmt',
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the Internal Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: 'INT FW PRIVATE IP OCID',
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
