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
{
  network_configuration+: {
    network_configuration_categories+: {
      shared+: {
        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZP-HUB-KEY'+: {
              drg_attachments+: {
                'DRGATT-FRA-LZP-PP-PROJECTS-VCN-KEY': {
                  display_name: 'drgatt-fra-lzp-pp-projects-vcn',
                  drg_route_table_key: 'DRGRT-FRA-LZP-SPOKES-KEY',
                  network_details: {
                    attached_resource_key: 'VCN-FRA-LZP-PP-PROJECTS-KEY',
                    type: 'VCN',
                  },
                },
                'DRGATT-FRA-LZP-P-PROJECTS-VCN-KEY': {
                  display_name: 'drgatt-fra-lzp-p-projects-vcn',
                  drg_route_table_key: 'DRGRT-FRA-LZP-SPOKES-KEY',
                  network_details: {
                    attached_resource_key: 'VCN-FRA-LZP-P-PROJECTS-KEY',
                    type: 'VCN',
                  },
                },
              },

              drg_route_distributions+: {
                'IRTD-FRA-LZP-HUB-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-PREPROD-KEY': {
                      action: 'ACCEPT',
                      match_criteria: {
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZP-PP-PROJECTS-VCN-KEY',
                        match_type: 'DRG_ATTACHMENT_ID',
                      },
                      priority: 20,
                    },
                    'ROUTE-TO-VCN-PROD-KEY': {
                      action: 'ACCEPT',
                      match_criteria: {
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZP-P-PROJECTS-VCN-KEY',
                        match_type: 'DRG_ATTACHMENT_ID',
                      },
                      priority: 10,
                    },
                  },
                },

              },
              drg_route_tables+: {
                'DRGRT-FRA-LZP-SPOKES-KEY': {
                  display_name: 'drgrt-fra-lzp-spokes',
                  is_ecmp_enabled: false,
                  route_rules: {
                    'DRGRT-FRA-LZP-SPOKES-STATIC-ROUTE': {
                      destination: '0.0.0.0/0',
                      destination_type: 'CIDR_BLOCK',
                      next_hop_drg_attachment_key: 'DRGATT-FRA-LZP-HUB-VCN-KEY',
                    },
                  },
                },
              },
            },
          },

        },
      },
      preprod+: {
        category_compartment_id: 'CMP-LZP-PP-NETWORK-KEY',
        vcns: {
          'VCN-FRA-LZP-PP-PROJECTS-KEY': {
            block_nat_traffic: false,
            cidr_blocks: [
              '10.0.128.0/21',
            ],
            display_name: 'vcn-fra-lzp-pp-projects',
            dns_label: 'vcnfralzpppproj',
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,
            route_tables: {
              'RT-01-LZP-PP-PROJECTS-VCN-GEN-KEY': {
                display_name: 'rt-01-lzp-p-projects-vcn-gen',
                route_rules: {
                  sgw_route: {
                    description: 'Route for sgw',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZP-PP-PROJECTS-KEY',
                  },
                  drg_route: {
                    description: 'Route to DRG',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
            },
            default_security_list: {
              egress_rules: [],
              ingress_rules: [
                {
                  stateless: false,
                  protocol: 'ICMP',
                  description: 'ICMP type 3 code 4',
                  src: '0.0.0.0/0',
                  src_type: 'CIDR_BLOCK',
                  icmp_type: 3,
                  icmp_code: 4,
                },
                {
                  stateless: false,
                  protocol: 'ICMP',
                  description: 'ICMP type 8 (Echo)',
                  src: '10.0.0.0/21',
                  src_type: 'CIDR_BLOCK',
                  icmp_type: 8,
                  icmp_code: 0,
                },
              ],
            },
            security_lists: {
              'SL-LZP-PP-PROJECTS-GENERIC-KEY': {
                display_name: 'sl-lzp-pp-projects-generic',
                egress_rules: [
                  {
                    description: 'egress to 0.0.0.0/0 over ALL protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                  {
                    description: 'egress rule for OSN',
                    dst: 'all-services',
                    dst_type: 'SERVICE_CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                ],
                ingress_rules: [
                  {
                    description: 'ingress from 10.0.3.0/24 over TCP22',
                    dst_port_max: 22,
                    dst_port_min: 22,
                    protocol: 'TCP',
                    src: '10.0.3.0/24',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  {
                    stateless: false,
                    protocol: 'ICMP',
                    description: 'ICMP type 3 code 4',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 3,
                    icmp_code: 4,
                  },
                  {
                    stateless: false,
                    protocol: 'ICMP',
                    description: 'ICMP type 8 (Echo)',
                    src: '10.0.0.0/21',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 8,
                    icmp_code: 0,
                  },
                ],
              },
            },
            network_security_groups: {
              'NSG-LZP-PP-PROJECTS-WEB1-KEY': {
                compartment_id: 'CMP-LZP-PP-PROJ1-APP-KEY',
                display_name: 'nsg-lzp-pp-projects-web1',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  http_80: {
                    description: 'ingress from 0.0.0.0/0 over TCP 80',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  http_443: {
                    description: 'ingress from 0.0.0.0/0 over TCP 443',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  ssh_22: {
                    description: 'ingress from 10.0.3.0/24 over TCP 22',
                    dst_port_max: 22,
                    dst_port_min: 22,
                    protocol: 'TCP',
                    src: '10.0.3.0/24',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                },
              },
              'NSG-LZP-PP-PROJECTS-APP1-KEY': {
                compartment_id: 'CMP-LZP-PP-PROJ1-APP-KEY',
                display_name: 'nsg-lzp-pp-projects-app1',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  nsg_web1_80: {
                    description: 'ingress from NSG nsg-lzp-pp-projects-web1 over TCP 80',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    src: 'NSG-LZP-PP-PROJECTS-WEB1-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_web1_443: {
                    description: 'ingress from NSG nsg-lzp-pp-projects-web1 over TCP 443',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    src: 'NSG-LZP-PP-PROJECTS-WEB1-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
              'NSG-LZP-PP-PROJECTS-DB1-KEY': {
                compartment_id: 'CMP-LZP-PP-PROJ1-DB-KEY',
                display_name: 'nsg-lzp-pp-projects-db1',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  nsg_app1_1521: {
                    description: 'ingress from NSG nsg-lzp-pp-projects-app1 over TCP 1521',
                    dst_port_max: 1521,
                    dst_port_min: 1521,
                    protocol: 'TCP',
                    src: 'NSG-LZP-PP-PROJECTS-APP1-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
            },
            subnets: {
              'SSN-FRA-LZP-PP-WEB-KEY': {
                cidr_block: '10.0.128.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-pp-web',
                dns_label: 'ssnfralzpppweb',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-PP-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
              'SSN-FRA-LZP-PP-APP-KEY': {
                cidr_block: '10.0.129.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-pp-app',
                dns_label: 'ssnfralzpppapp',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-PP-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'SL-LZP-PP-PROJECTS-GENERIC-KEY',
                ],
              },
              'SSN-FRA-LZP-PP-DB-KEY': {
                cidr_block: '10.0.130.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-pp-db',
                dns_label: 'ssnfralzpppdb',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-PP-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'SL-LZP-PP-PROJECTS-GENERIC-KEY',
                ],
              },
              'SSN-FRA-LZP-PP-INFRA': {
                cidr_block: '10.0.131.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-pp-infra',
                dns_label: 'ssnfralzpppinfr',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-PP-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'SL-LZP-PP-PROJECTS-GENERIC-KEY',
                ],
              },
            },
            vcn_specific_gateways: {
              service_gateways: {
                'SGW-FRA-LZP-PP-PROJECTS-KEY': {
                  display_name: 'sgw-fra-lzp-pp-projects',
                  services: 'all-services',
                },
              },
            },
          },
        },
      },
      prod+: {
        category_compartment_id: 'CMP-LZP-P-NETWORK-KEY',
        vcns: {
          'VCN-FRA-LZP-P-PROJECTS-KEY': {
            block_nat_traffic: false,
            cidr_blocks: [
              '10.0.64.0/21',
            ],
            display_name: 'vcn-fra-lzp-p-projects',
            dns_label: 'vcnfralzppprojs',
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,
            route_tables: {
              'RT-01-LZP-P-PROJECTS-VCN-GEN-KEY': {
                display_name: 'rt-01-lzp-p-projects-vcn-gen',
                route_rules: {
                  sgw_route: {
                    description: 'Route for sgw',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZP-P-PROJECTS-KEY',
                  },
                  drg_route: {
                    description: 'Route to DRG',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
            },
            default_security_list: {
              egress_rules: [],
              ingress_rules: [
                {
                  stateless: false,
                  protocol: 'ICMP',
                  description: 'ICMP type 3 code 4',
                  src: '0.0.0.0/0',
                  src_type: 'CIDR_BLOCK',
                  icmp_type: 3,
                  icmp_code: 4,
                },
                {
                  stateless: false,
                  protocol: 'ICMP',
                  description: 'ICMP type 8 (Echo)',
                  src: '10.0.0.0/21',
                  src_type: 'CIDR_BLOCK',
                  icmp_type: 8,
                  icmp_code: 0,
                },
              ],
            },
            security_lists: {
              'SL-LZP-P-PROJECTS-GENERIC-KEY': {
                display_name: 'sl-lzp-p-projects-generic',
                egress_rules: [
                  {
                    description: 'egress to 0.0.0.0/0 over ALL protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                  {
                    description: 'egress rule for OSN',
                    dst: 'all-services',
                    dst_type: 'SERVICE_CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                ],
                ingress_rules: [
                  {
                    description: 'ingress from 10.0.3.0/24 over TCP22',
                    dst_port_max: 22,
                    dst_port_min: 22,
                    protocol: 'TCP',
                    src: '10.0.3.0/24',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  {
                    stateless: false,
                    protocol: 'ICMP',
                    description: 'ICMP type 3 code 4',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 3,
                    icmp_code: 4,
                  },
                  {
                    stateless: false,
                    protocol: 'ICMP',
                    description: 'ICMP type 8 (Echo)',
                    src: '10.0.0.0/21',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 8,
                    icmp_code: 0,
                  },
                ],
              },
            },
            network_security_groups: {
              'NSG-LZP-P-PROJECTS-WEB1-KEY': {
                compartment_id: 'CMP-LZP-P-PROJ1-APP-KEY',
                display_name: 'nsg-lzp-p-projects-web1',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  http_80: {
                    description: 'ingress from 0.0.0.0/0 over TCP 80',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  http_443: {
                    description: 'ingress from 0.0.0.0/0 over TCP 443',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  ssh_22: {
                    description: 'ingress from 10.0.3.0/24 over TCP 22',
                    dst_port_max: 22,
                    dst_port_min: 22,
                    protocol: 'TCP',
                    src: '10.0.3.0/24',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                },
              },
              'NSG-LZP-P-PROJECTS-APP1-KEY': {
                compartment_id: 'CMP-LZP-P-PROJ1-APP-KEY',
                display_name: 'nsg-lzp-p-projects-app1',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  nsg_web1_80: {
                    description: 'ingress from NSG nsg-lzp-p-projects-web1 over TCP 80',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    src: 'NSG-LZP-P-PROJECTS-WEB1-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                  nsg_web1_443: {
                    description: 'ingress from NSG nsg-lzp-p-projects-web1 over TCP 443',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    src: 'NSG-LZP-P-PROJECTS-WEB1-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
              'NSG-LZP-P-PROJECTS-DB1-KEY': {
                compartment_id: 'CMP-LZP-P-PROJ1-DB-KEY',
                display_name: 'nsg-lzp-p-projects-db1',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  nsg_app1_1521: {
                    description: 'ingress from NSG nsg-lzp-p-projects-app1 over TCP 1521',
                    dst_port_max: 1521,
                    dst_port_min: 1521,
                    protocol: 'TCP',
                    src: 'NSG-LZP-P-PROJECTS-APP1-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    stateless: false,
                  },
                },
              },
            },
            subnets: {
              'SSN-FRA-LZP-P-WEB-KEY': {
                cidr_block: '10.0.64.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-p-web',
                dns_label: 'ssnfralzppweb',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-P-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
              'SSN-FRA-LZP-P-APP-KEY': {
                cidr_block: '10.0.65.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-p-app',
                dns_label: 'ssnfralzppapp',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-P-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'SL-LZP-P-PROJECTS-GENERIC-KEY',
                ],
              },
              'SSN-FRA-LZP-P-DB-KEY': {
                cidr_block: '10.0.66.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-p-db',
                dns_label: 'ssnfralzppdb',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-P-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'SL-LZP-P-PROJECTS-GENERIC-KEY',
                ],
              },
              'SSN-FRA-LZP-P-INFRA': {
                cidr_block: '10.0.67.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'ssn-fra-lzp-p-infra',
                dns_label: 'ssnfralzppinfra',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-01-LZP-P-PROJECTS-VCN-GEN-KEY',
                security_list_keys: [
                  'SL-LZP-P-PROJECTS-GENERIC-KEY',
                ],
              },
            },
            vcn_specific_gateways: {
              service_gateways: {
                'SGW-FRA-LZP-P-PROJECTS-KEY': {
                  display_name: 'sgw-fra-lzp-p-projects',
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
