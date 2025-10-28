{
  network_configuration: {
    default_compartment_id: 'CMP-LZP-NETWORK-KEY',
    default_enable_cis_checks: false,
    network_configuration_categories: {
      '0-shared': {
        category_compartment_key: 'CMP-LZP-NETWORK-KEY',
        vcns: {
          'VCN-FRA-LZP-HUB-KEY': {
            block_nat_traffic: false,
            cidr_blocks: [
              '10.0.0.0/21',
            ],
            display_name: 'vcn-fra-lzp-hub',
            dns_label: 'vcnfralzphub',
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,
            route_tables: {
              'RT-00-FRA-LZP-HUB-VCN-INGRESS-KEY': {
                display_name: 'rt-fra-lzp-hub-ingress',
                route_rules: {
                },
              },
              'RT-01-FRA-LZP-HUB-VCN-LB-KEY': {
                display_name: 'rt-fra-lzp-hub-lb',
                route_rules: {
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
                },
              },
              'RT-05-FRA-LZP-HUB-VCN-IGW-KEY': {
                display_name: 'rt-fra-lzp-hub-igw',
                route_rules: {
                },
              },
              'RT-06-LZP-HUB-VCN-MGMT-KEY': {
                display_name: 'rt-fra-lzp-hub-mgmt',
                route_rules: {
                  'rt-sgw': {
                    description: 'Route for sgw',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZP-HUB-KEY',
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
              ],
            },
            security_lists: {
              'SL-FRA-LZP-HUB-MGMT-KEY': {
                display_name: 'sl-fra-lzp-hub-mgmt',
                egress_rules: [
                  {
                    description: 'egress to 0.0.0.0/0 over ALL protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                ],
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
                  {
                    description: 'ingress from the Bastion Managed Service private endpoint IP address',
                    protocol: 'TCP',
                    dst_port_max: 22,
                    dst_port_min: 22,
                    src: '10.0.3.132/32',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                ],
              },
            },
            network_security_groups: {
              'NSG-FRA-LZP-HUB-LB-KEY': {
                display_name: 'nsg-fra-lzp-hub-lb',
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
                    description: 'ingress from 0.0.0.0/0 over HTTP 80',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                  http_443: {
                    description: 'ingress from 0.0.0.0/0 over HTTPS 443',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                },
              },
              'NSG-FRA-LZP-HUB-JUMPSERVER-KEY': {
                display_name: 'nsg-fra-lzp-hub-jumpserver',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over TCP',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                },
                ingress_rules: {
                  ssh_22: {
                    description: 'ingress from 0.0.0.0/0 over SSH',
                    protocol: 'ALL',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: false,
                  },
                },
              },
              'NSG-FRA-LZP-HUB-FW-INT-KEY': {
                display_name: 'nsg-fra-lzp-hub-fw-int',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over ALL protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: true,
                  },
                },
                ingress_rules: {
                  icmp_dont_fragment: {
                    stateless: true,
                    protocol: 'ICMP',
                    description: 'ICMP type 3 code 4',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 3,
                    icmp_code: 4,
                  },
                  icmp_echo: {
                    stateless: true,
                    protocol: 'ICMP',
                    description: 'ICMP type 8 (Echo)',
                    src: '10.0.0.0/21',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 8,
                    icmp_code: 0,
                  },
                  all_tcp: {
                    description: 'ingress from anywhere to any TCP port (response from NAT)',
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: true,
                  },
                },
              },
              'NSG-FRA-LZP-HUB-FW-DMZ-KEY': {
                display_name: 'nsg-fra-lzp-hub-fw-dmz',
                egress_rules: {
                  anywhere: {
                    description: 'egress to 0.0.0.0/0 over ALL protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: true,
                  },
                },
                ingress_rules: {
                  icmp_dont_fragment: {
                    stateless: true,
                    protocol: 'ICMP',
                    description: 'ICMP type 3 code 4',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 3,
                    icmp_code: 4,
                  },
                  icmp_echo: {
                    stateless: true,
                    protocol: 'ICMP',
                    description: 'ICMP type 8 (Echo)',
                    src: '10.0.0.0/21',
                    src_type: 'CIDR_BLOCK',
                    icmp_type: 8,
                    icmp_code: 0,
                  },
                  all_tcp: {
                    description: 'ingress from anywhere to any TCP port (response from IGW)',
                    protocol: 'TCP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    stateless: true,
                  },
                },
              },
            },
            subnets: {
              'SN-FRA-LZP-HUB-FW-DMZ-KEY': {
                cidr_block: '10.0.0.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'sn-fra-lzp-hub-fw-dmz',
                dns_label: 'snfrahubfwdmz',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-02-FRA-LZP-HUB-VCN-FWDMZ-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
              'SN-FRA-LZP-HUB-LB-KEY': {
                availability_domain: null,
                cidr_block: '10.0.1.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'sn-fra-lzp-hub-lb',
                dns_label: 'snfrahublb',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-01-FRA-LZP-HUB-VCN-LB-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
              'SN-FRA-LZP-HUB-FW-INT-KEY': {
                cidr_block: '10.0.2.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'sn-fra-lzp-hub-fw-int',
                dns_label: 'snfrahubfwint',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-03-FRA-LZP-HUB-VCN-FWINT-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
              'SN-FRA-LZP-HUB-MGMT-KEY': {
                cidr_block: '10.0.3.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'sn-fra-lzp-hub-mgmt',
                dns_label: 'snfrahubmgmt',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-06-LZP-HUB-VCN-MGMT-KEY',
                security_list_keys: [
                  'SL-FRA-LZP-HUB-MGMT-KEY',
                ],
              },
              'SN-FRA-LZP-HUB-LOGS-KEY': {
                cidr_block: '10.0.4.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'sn-fra-lzp-hub-logs',
                dns_label: 'snfrahublogs',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-06-LZP-HUB-VCN-MGMT-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
              'SN-FRA-LZP-HUB-DNS': {
                cidr_block: '10.0.5.0/24',
                dhcp_options_key: 'default_dhcp_options',
                display_name: 'sn-fra-lzp-hub-dns',
                dns_label: 'snfrahubdns',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-06-LZP-HUB-VCN-MGMT-KEY',
                security_list_keys: [
                  'default_security_list',
                ],
              },
            },
            vcn_specific_gateways: {
              internet_gateways: {
                'IGW-FRA-LZP-HUB-KEY': {
                  display_name: 'igw-fra-lzp-hub',
                  route_table_key: 'RT-05-FRA-LZP-HUB-VCN-IGW-KEY',
                },
              },
              nat_gateways: {
                'NGW-FRA-LZP-HUB-KEY': {
                  display_name: 'ngw-fra-lzp-hub',
                  route_table_key: 'RT-04-FRA-LZP-HUB-VCN-NATGW-KEY',
                },
              },
              service_gateways: {
                'SGW-FRA-LZP-HUB-KEY': {
                  display_name: 'sgw-fra-lzp-hub',
                  services: 'all-services',
                },
              },
            },
          },
        },
        non_vcn_specific_gateways: {
          dynamic_routing_gateways: {
            'DRG-FRA-LZP-HUB-KEY': {
              display_name: 'drg-fra-hub',
              drg_attachments: {
                'DRGATT-FRA-LZP-HUB-VCN-KEY': {
                  display_name: 'drgatt-fra-lzp-hub-vcn',
                  drg_route_table_key: 'DRGRT-FRA-LZP-HUB-KEY',
                  network_details: {
                    attached_resource_key: 'VCN-FRA-LZP-HUB-KEY',
                    type: 'VCN',
                    route_table_key: 'RT-00-FRA-LZP-HUB-VCN-INGRESS-KEY',
                  },
                },
              },
              drg_route_distributions: {
                'IRTD-FRA-LZP-HUB-KEY': {
                  display_name: 'irtd-fra-lzp-hub',
                  distribution_type: 'IMPORT',
                  statements: {
                  },
                },
              },
              drg_route_tables: {
                'DRGRT-FRA-LZP-HUB-KEY': {
                  display_name: 'drgrt-fra-lzp-hub',
                  import_drg_route_distribution_key: 'IRTD-FRA-LZP-HUB-KEY',
                  is_ecmp_enabled: false,
                  route_rules: {},
                },
              },
            },
          },
          l7_load_balancers: {
            '//': 'See Docs at https://github.com/oci-landing-zones/terraform-oci-modules-networking/tree/main/modules/l7_load_balancers#oci-landing-zone-oci-native-applicationl7-load-balancerlbaas-module',
            'LB-FRA-LZP-PROD-01-KEY': {
              display_name: 'lb-fra-lzp-prod-01',
              ip_mode: 'IPV4',
              is_private: false,
              subnet_keys: ['SN-FRA-LZP-HUB-LB-KEY'],
              network_security_group_keys: ['NSG-FRA-LZP-HUB-LB-KEY'],
              shape: 'flexible',
              shape_details: {
                maximum_bandwidth_in_mbps: 10,
                minimum_bandwidth_in_mbps: 10,
              },
              listeners: {
                'LBLSNR-FRA-LZP-PROD-01-KEY': {
                  connection_configuration: {
                    idle_timeout_in_seconds: 1200,
                  },
                  name: 'lblsnr-fra-lzp-prod-01',
                  default_backend_set_key: 'LBBKST-FRA-LZP-PROD-01-KEY',
                  port: '80',
                  protocol: 'HTTP',
                  routing_policy_key: 'LBRT-FRA-LZP-PROD-01-KEY',
                },
              },
              backend_sets: {
                'LBBKST-FRA-LZP-PROD-01-KEY': {
                  name: 'lbbkst-fra-lzp-prod-01',
                  policy: 'ROUND_ROBIN',
                  backends: {
                    'LBBE-FRA-LZP-PROD-01-KEY': {
                      ip_address: '10.0.64.10',
                      port: 80,
                    },
                  },
                  health_checker: {
                    interval_ms: 10000,
                    is_force_plain_text: true,
                    port: 80,
                    protocol: 'HTTP',
                    retries: 3,
                    return_code: 200,
                    timeout_in_millis: 3000,
                    url_path: '/testapp1/',
                  },
                },
                'LBBKST-FRA-LZP-PROD-02-KEY': {
                  name: 'lbbkst-fra-lzp-prod-02',
                  policy: 'ROUND_ROBIN',
                  backends: {
                    'LBBE-FRA-LZP-PROD-02-KEY': {
                      ip_address: '10.0.64.11',
                      port: 80,
                    },
                  },
                  health_checker: {
                    interval_ms: 10000,
                    is_force_plain_text: true,
                    port: 80,
                    protocol: 'HTTP',
                    retries: 3,
                    return_code: 200,
                    timeout_in_millis: 3000,
                    url_path: '/testapp2/',
                  },
                },
              },
              routing_policies: {
                'LBRT-FRA-LZP-PROD-01-KEY': {
                  name: 'lbrt-fra-lzp-prod-01',
                  condition_language_version: 'V1',
                  rules: {
                    lbrouterule_testapp1: {
                      actions: {
                        'action-1': {
                          backend_set_key: 'LBBKST-FRA-LZP-PROD-01-KEY',
                          name: 'FORWARD_TO_BACKENDSET',
                        },
                      },
                      condition: 'all(http.request.url.path sw (i ‘/testapp1/‘))',
                      name: 'testapp1',
                    },
                    lbrouterule_testapp2: {
                      actions: {
                        'action-2': {
                          backend_set_key: 'LBBKST-FRA-LZP-PROD-02-KEY',
                          name: 'FORWARD_TO_BACKENDSET',
                        },
                      },
                      condition: 'all(http.request.url.path sw (i ‘/testapp2/’))',
                      name: 'testapp2',
                    },
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
