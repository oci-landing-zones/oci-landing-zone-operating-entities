{
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: {
                  'rt-fra-vcn-prod-platform-finops': {
                    description: 'Route to VCN Prod Platform FinOps through DRG',
                    destination: '10.0.24.0/27',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: {
                  'rt-fra-vcn-prod-platform-finops': {
                    description: 'Route to VCN Prod Platform FinOps through DRG',
                    destination: '10.0.24.0/27',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
            },
          },
        },
        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZ-HUB-KEY'+: {
              drg_attachments+: {
                'DRGATT-FRA-LZ-PROD-PLATFORM-FINOPS-KEY': {
                  display_name: 'drgatt-fra-lz-prod-platform-finops',
                  drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',

                  network_details: {
                    type: 'VCN',
                    attached_resource_key: 'VCN-FRA-LZ-PROD-PLATFORM-FINOPS-KEY',
                  },
                },
              },
              drg_route_distributions+: {
                'DRGRD-FRA-LZ-HUB-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-FINOPS-KEY': {
                      priority: 30,
                      action: 'ACCEPT',
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PLATFORM-FINOPS-KEY',
                      },
                    },
                  },
                },
                'DRGRD-FRA-LZ-SPOKE-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-S-FINOPS-KEY': {
                      priority: 40,
                      action: 'ACCEPT',
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PLATFORM-FINOPS-KEY',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      '3-finops': {
        category_compartment_id: 'CMP-LZ-NETWORK-KEY',

        vcns: {
          'VCN-FRA-LZ-PROD-PLATFORM-FINOPS-KEY': {
            display_name: 'vcn-fra-lz-prod-platform-finops',
            cidr_blocks: ['10.0.24.0/27'],
            dns_label: 'vcnfralzpfops',
            block_nat_traffic: false,
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: {
              'SN-FRA-LZ-PROD-FINOPS-APP-KEY': {
                display_name: 'sn-fra-lz-prod-finops-app',
                cidr_block: '10.0.24.0/28',
                dns_label: 'snfrafopsapp',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-PROD-FINOPS-GEN-KEY',
                security_list_keys: ['SL-FRA-LZ-PROD-FINOPS-GEN-KEY'],
              },

              'SN-FRA-LZ-PROD-FINOPS-DB-KEY': {
                display_name: 'sn-fra-lz-prod-finops-db',
                cidr_block: '10.0.24.16/28',
                dns_label: 'snfrafopsdb',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-PROD-FINOPS-GEN-KEY',
                security_list_keys: ['SL-FRA-LZ-PROD-FINOPS-GEN-KEY'],
              },
            },

            route_tables: {
              'RT-FRA-LZ-PROD-FINOPS-GEN-KEY': {
                display_name: 'rt-fra-lz-prod-finops-generic',

                route_rules: {
                  'rt-fra-lz-hub': {
                    description: 'Route to Hub VCN through DRG',
                    destination: '10.0.0.0/21',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },

                  sgw_route: {
                    description: 'Route to Oracle Services Network through Service GW',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-PROD-FINOPS-KEY',
                  },
                },
              },
            },

            default_security_list: {
              egress_rules: [],
              ingress_rules: [
                {
                  description: 'ICMP type 3 code 4',
                  src: '0.0.0.0/0',
                  src_type: 'CIDR_BLOCK',
                  protocol: 'ICMP',
                  icmp_type: 3,
                  icmp_code: 4,
                  stateless: false,
                },
                {
                  description: 'ICMP type 8 (Echo)',
                  src: '10.0.0.0/21',
                  src_type: 'CIDR_BLOCK',
                  protocol: 'ICMP',
                  icmp_type: 8,
                  icmp_code: 0,
                  stateless: false,
                },
              ],
            },

            security_lists: {
              'SL-FRA-LZ-PROD-FINOPS-GEN-KEY': {
                display_name: 'sl-fra-lz-prod-finops-generic',

                ingress_rules: [
                  {
                    description: 'Ingress from Hub management subnet over TCP 22',
                    src: '10.0.1.0/24',
                    src_type: 'CIDR_BLOCK',
                    dst_port_min: 22,
                    dst_port_max: 22,
                    protocol: 'TCP',
                    stateless: false,
                  },
                  {
                    description: 'ICMP type 3 code 4',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    protocol: 'ICMP',
                    icmp_type: 3,
                    icmp_code: 4,
                    stateless: false,
                  },
                  {
                    description: 'ICMP type 8 (Echo)',
                    src: '10.0.0.0/21',
                    src_type: 'CIDR_BLOCK',
                    protocol: 'ICMP',
                    icmp_type: 8,
                    icmp_code: 0,
                    stateless: false,
                  },
                ],

                egress_rules: [
                  {
                    description: 'Allow all outbound traffic',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                  {
                    description: 'Allow outbound traffic to Oracle Services Network',
                    dst: 'all-services',
                    dst_type: 'SERVICE_CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                ],
              },
            },

            network_security_groups: {
              'NSG-FRA-LZ-PROD-FINOPS-DB-KEY': {
                display_name: 'nsg-fra-lz-prod-finops-db',
                compartment_id: 'CMP-LZ-PLATFORM-FINOPS-KEY',

                ingress_rules: {
                  'ssh_1521_1522': {
                    description: 'Ingress from Hub management subnet over TCP 1521-1522',
                    src: '10.0.1.0/24',
                    src_type: 'CIDR_BLOCK',
                    dst_port_min: 1521,
                    dst_port_max: 1522,
                    protocol: 'TCP',
                    stateless: false,
                  },
                },

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                },
              },
            },

            vcn_specific_gateways: {
              service_gateways: {
                'SGW-FRA-LZ-PROD-FINOPS-KEY': {
                  display_name: 'sgw-fra-lz-prod-finops',
                  services: 'all-services',
                },
              },
            },
          },
        },
      },
    },
  },
}
