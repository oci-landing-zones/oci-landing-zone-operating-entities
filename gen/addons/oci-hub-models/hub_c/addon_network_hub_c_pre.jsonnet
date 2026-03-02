local c = import '../hub_common.libsonnet';
local ip = import '../subnetting.libsonnet';
local lb = import '../hub_lb.libsonnet';

{
  network_configuration: {
    default_compartment_id: 'CMP-LZ-NETWORK-KEY',
    default_enable_cis_checks: false,

    network_configuration_categories: {
      '0-shared': {
        category_compartment_id: 'CMP-LZ-NETWORK-KEY',

        vcns: {
          'VCN-FRA-LZ-HUB-KEY': {
            display_name: 'vcn-fra-lz-hub',
            cidr_blocks: [ip.hub_vcn],
            dns_label: 'vcnfralzhub',
            block_nat_traffic: false,
            is_attach_drg: false,
            is_create_igw: false,
            is_ipv6enabled: false,
            is_oracle_gua_allocation_enabled: false,

            subnets: {
              'SN-FRA-LZ-HUB-UNTRUST-KEY': {
                display_name: 'sn-fra-lz-hub-untrust',
                dns_label: 'snfrahubuntrust',
                cidr_block: ip.hub_c.untrust_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-FRA-LZ-HUB-UNTRUST-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-UNTRUST-KEY'],
              },

              'SN-FRA-LZ-HUB-TRUST-KEY': {
                display_name: 'sn-fra-lz-hub-trust',
                dns_label: 'snfrahubtrust',
                cidr_block: ip.hub_c.trust_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-TRUST-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-TRUST-KEY'],
              },

              'SN-FRA-LZ-HUB-LB-KEY': {
                display_name: 'sn-fra-lz-hub-lb',
                dns_label: 'snfrahublb',
                cidr_block: ip.hub_c.lb_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-FRA-LZ-HUB-LB-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-LB-KEY'],
              },

              'SN-FRA-LZ-HUB-MGMT-KEY': {
                display_name: 'sn-fra-lz-hub-mgmt',
                dns_label: 'snfrahubmgmt',
                cidr_block: ip.hub_c.mgmt_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },

              'SN-FRA-LZ-HUB-MON-KEY': {
                display_name: 'sn-fra-lz-hub-mon',
                dns_label: 'snfrahubmon',
                cidr_block: ip.hub_c.mon_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },

              'SN-FRA-LZ-HUB-DNS': {
                display_name: 'sn-fra-lz-hub-dns',
                dns_label: 'snfrahubdns',
                cidr_block: ip.hub_c.dns_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },
            },

            route_tables: {
              'RT-FRA-LZ-HUB-IGW-KEY': {
                display_name: 'rt-fra-lz-hub-igw',
                route_rules: {},
              },

              'RT-FRA-LZ-HUB-INGRESS-KEY': {
                display_name: 'rt-fra-lz-hub-ingress',
                route_rules: {},
              },

              'RT-FRA-LZ-HUB-LB-KEY': {
                display_name: 'rt-fra-lz-hub-lb',
                route_rules: {},
              },

              'RT-FRA-LZ-HUB-MGMT-KEY': {
                display_name: 'rt-fra-lz-hub-mgmt',

                route_rules: {
                  'rt-sgw': {
                    description: 'Route to Oracle Services Network through Service GW',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-HUB-KEY',
                  },
                },
              },

              'RT-FRA-LZ-HUB-TRUST-KEY': {
                display_name: 'rt-fra-lz-hub-trust',
                route_rules: {},
              },

              'RT-FRA-LZ-HUB-UNTRUST-KEY': {
                display_name: 'rt-fra-lz-hub-untrust',

                route_rules: {
                  'rt-igw': {
                    description: 'Route to the Internet through Internet GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'IGW-FRA-LZ-HUB-KEY',
                  },
                },
              },
            },

            default_security_list: {
              egress_rules: [],
              ingress_rules: [],
            },

            security_lists: {
              'SL-FRA-LZ-HUB-LB-KEY': lb._sl_lb['SL-FRA-LZ-HUB-LB-KEY'],

              'SL-FRA-LZ-HUB-MGMT-KEY': c._sl_mgmt(ip.hub_c.bastion_ip),

              'SL-FRA-LZ-HUB-TRUST-KEY': {
                display_name: 'sl-fra-lz-hub-trust',
                egress_rules: [],
                ingress_rules: c._sl_fw.ingress_rules,
              },

              'SL-FRA-LZ-HUB-UNTRUST-KEY': {
                display_name: 'sl-fra-lz-hub-untrust',
                egress_rules: [],
                ingress_rules: c._sl_fw.ingress_rules,
              },
            },

            network_security_groups: {
              'NSG-FRA-LZ-HUB-LB-KEY': {
                display_name: 'nsg-fra-lz-hub-lb',

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  http_80: {
                    description: 'Allow inbound traffic from Hub Untrust subnet over HTTP',
                    src: ip.hub_c.untrust_sn,
                    src_type: 'CIDR_BLOCK',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    stateless: false,
                  },

                  https_443: {
                    description: 'Allow inbound traffic from Hub Untrust subnet over HTTPS',
                    src: ip.hub_c.untrust_sn,
                    src_type: 'CIDR_BLOCK',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-HUB-TRUST-FW-KEY': {
                display_name: 'nsg-fra-lz-hub-trust-fw',

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  from_trust_nlb_http: {
                    description: 'Allow inbound from NSG nsg-fra-lz-hub-trust-nlb over HTTP',
                    src: 'NSG-FRA-LZ-HUB-TRUST-NLB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    stateless: false,
                  },

                  from_trust_nlb_https: {
                    description: 'Allow inbound from NSG nsg-fra-lz-hub-trust-nlb over HTTPS',
                    src: 'NSG-FRA-LZ-HUB-TRUST-NLB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    stateless: false,
                  },

                  from_trust_nlb_icmp: {
                    description: 'Allow ICMP type 8 (Echo) from NSG nsg-fra-lz-hub-trust-nlb',
                    src: 'NSG-FRA-LZ-HUB-TRUST-NLB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    protocol: 'ICMP',
                    icmp_type: 8,
                    icmp_code: 0,
                    stateless: false,
                  },

                  from_trust_nlb_ssh: {
                    description: 'Allow inbound from NSG nsg-fra-lz-hub-trust-nlb over SSH',
                    src: 'NSG-FRA-LZ-HUB-TRUST-NLB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    dst_port_max: 22,
                    dst_port_min: 22,
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-HUB-TRUST-NLB-KEY': {
                display_name: 'nsg-fra-lz-hub-trust-nlb',
                ingress_rules: {},

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-HUB-UNTRUST-FW-KEY': {
                display_name: 'nsg-fra-lz-hub-untrust-fw',

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  from_untrust_nlb: {
                    description: 'Allow inbound from NSG nsg-fra-lz-hub-untrust-nlb over TCP ALL',
                    src: 'NSG-FRA-LZ-HUB-UNTRUST-NLB-KEY',
                    src_type: 'NETWORK_SECURITY_GROUP',
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
              },

              'NSG-FRA-LZ-HUB-UNTRUST-NLB-KEY': {
                display_name: 'nsg-fra-lz-hub-untrust-nlb',

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },
                },

                ingress_rules: {
                  http_443: {
                    description: 'Allow inbound traffic from 0.0.0.0/0 over HTTPS',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    dst_port_max: 443,
                    dst_port_min: 443,
                    protocol: 'TCP',
                    stateless: false,
                  },

                  http_80: {
                    description: 'Allow inbound traffic from 0.0.0.0/0 over HTTP',
                    src: '0.0.0.0/0',
                    src_type: 'CIDR_BLOCK',
                    dst_port_max: 80,
                    dst_port_min: 80,
                    protocol: 'TCP',
                    stateless: false,
                  },
                },
              },
            },

            vcn_specific_gateways: {
              internet_gateways: {
                'IGW-FRA-LZ-HUB-KEY': {
                  display_name: 'igw-fra-lz-hub',
                  route_table_key: 'RT-FRA-LZ-HUB-IGW-KEY',
                },
              },

              service_gateways: {
                'SGW-FRA-LZ-HUB-KEY': {
                  display_name: 'sgw-fra-lz-hub',
                  services: 'all-services',
                },
              },
            },
          },
        },

        non_vcn_specific_gateways: {
          dynamic_routing_gateways: {
            'DRG-FRA-LZ-HUB-KEY': {
              display_name: 'drg-fra-lz-hub',

              drg_attachments: {
                'DRGATT-FRA-LZ-HUB-VCN-KEY': {
                  display_name: 'drgatt-fra-lz-hub',
                  drg_route_table_key: 'DRGRT-FRA-LZ-HUB-KEY',

                  network_details: {
                    type: 'VCN',
                    attached_resource_key: 'VCN-FRA-LZ-HUB-KEY',
                    route_table_key: 'RT-FRA-LZ-HUB-INGRESS-KEY',
                  },
                },
              },

              drg_route_distributions: {
                'DRGRD-FRA-LZ-HUB-KEY': {
                  display_name: 'drgrd-fra-lz-hub',
                  distribution_type: 'IMPORT',
                  statements: {},
                },
              },

              drg_route_tables: {
                'DRGRT-FRA-LZ-HUB-KEY': {
                  display_name: 'drgrt-fra-lz-hub',
                  import_drg_route_distribution_key: 'DRGRD-FRA-LZ-HUB-KEY',
                  is_ecmp_enabled: false,
                  route_rules: {},
                },

                'DRGRT-FRA-LZ-SPOKES-KEY': {
                  display_name: 'drgrt-fra-lz-spokes',
                  is_ecmp_enabled: false,

                  route_rules: {
                    'DRGRT-FRA-LZ-SPOKES-STATIC-ROUTE': {
                      destination: '0.0.0.0/0',
                      destination_type: 'CIDR_BLOCK',
                      next_hop_drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
                    },
                  },
                },
              },
            },
          },

          l7_load_balancers: lb._l7_lb,
        },
      },
    },
  },

  nlb_configuration: {
    default_compartment_id: 'CMP-LZ-NETWORK-KEY',

    nlbs: {
      'NLB-FRA-LZ-HUB-TRUST-KEY': {
        display_name: 'nlb-fra-hub-trust',
        enable_symmetric_hashing: true,
        is_preserve_source_destination: true,
        is_private: true,
        network_security_group_ids: ['NSG-FRA-LZ-HUB-TRUST-NLB-KEY'],
        subnet_id: 'SN-FRA-LZ-HUB-TRUST-KEY',

        listeners: {
          'NLBLSNR-FRA-LZ-HUB-TRUST-KEY': {
            name: 'listener-fra-trust',
            protocol: 'ANY',
            port: '0',

            backend_set: {
              name: 'backend-set-fra-trust',
              backends: {},

              health_checker: {
                protocol: 'TCP',
                port: '22',
                interval_in_millis: '10000',
                retries: '3',
                timeout_in_millis: '3000',
              },
            },
          },
        },
      },

      'NLB-FRA-LZ-HUB-UNTRUST-KEY': {
        display_name: 'nlb-fra-hub-untrust',
        enable_symmetric_hashing: true,
        is_preserve_source_destination: true,
        is_private: true,
        network_security_group_ids: ['NSG-FRA-LZ-HUB-UNTRUST-NLB-KEY'],
        subnet_id: 'SN-FRA-LZ-HUB-UNTRUST-KEY',

        listeners: {
          'NLBLSNR-FRA-LZ-HUB-UNTRUST-KEY': {
            name: 'listener-fra-untrust',
            protocol: 'ANY',
            port: '0',

            backend_set: {
              name: 'backend-set-fra-untrust',
              backends: {},

              health_checker: {
                protocol: 'TCP',
                port: '22',
                interval_in_millis: '10000',
                retries: '3',
                timeout_in_millis: '3000',
              },
            },
          },
        },
      },
    },
  },
}
