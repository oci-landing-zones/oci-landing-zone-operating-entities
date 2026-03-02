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
              'SN-FRA-LZ-HUB-LB-KEY': {
                display_name: 'sn-fra-lz-hub-lb',
                cidr_block: ip.hub_e.lb_sn,
                dns_label: 'snfrahublb',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-FRA-LZ-HUB-LB-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-LB-KEY'],
              },

              'SN-FRA-LZ-HUB-MGMT-KEY': {
                display_name: 'sn-fra-lz-hub-mgmt',
                cidr_block: ip.hub_e.mgmt_sn,
                dns_label: 'snfrahubmgmt',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },

              'SN-FRA-LZ-HUB-MON-KEY': {
                display_name: 'sn-fra-lz-hub-mon',
                cidr_block: ip.hub_e.mon_sn,
                dns_label: 'snfrahubmon',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },

              'SN-FRA-LZ-HUB-DNS': {
                display_name: 'sn-fra-lz-hub-dns',
                cidr_block: ip.hub_e.dns_sn,
                dns_label: 'snfrahubdns',
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },
            },

            route_tables: {
              'RT-FRA-LZ-HUB-LB-KEY': {
                display_name: 'rt-fra-lz-hub-lb',

                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through Internet GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'IGW-FRA-LZ-HUB-KEY',
                  },
                },
              },

              'RT-FRA-LZ-HUB-MGMT-KEY': {
                display_name: 'rt-fra-lz-hub-mgmt',

                route_rules: {
                  'rt-natgw': {
                    description: 'Route to Internet through NAT GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-HUB-KEY',
                  },

                  'rt-sgw': {
                    description: 'Route to Oracle Services Network through Service GW',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-HUB-KEY',
                  },
                },
              },
            },

            default_security_list: {
              egress_rules: [],
              ingress_rules: [],
            },

            security_lists: lb._sl_lb {
              'SL-FRA-LZ-HUB-MGMT-KEY': c._sl_mgmt(ip.hub_e.bastion_ip),
            },

            network_security_groups: lb._nsg_lb,

            vcn_specific_gateways: {
              internet_gateways: {
                'IGW-FRA-LZ-HUB-KEY': {
                  display_name: 'igw-fra-lz-hub',
                },
              },

              nat_gateways: {
                'NGW-FRA-LZ-HUB-KEY': {
                  display_name: 'ngw-fra-lz-hub',
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
                    attached_resource_key: 'VCN-FRA-LZ-HUB-KEY',
                    type: 'VCN',
                  },
                },
              },

              drg_route_distributions: {
                'DRGRD-FRA-LZ-HUB-KEY': {
                  display_name: 'drgrd-fra-lz-hub',
                  distribution_type: 'IMPORT',
                  statements: {},
                },

                'DRGRD-FRA-LZ-SPOKE-KEY': {
                  display_name: 'drgrd-fra-lz-spoke',
                  distribution_type: 'IMPORT',

                  statements: {
                    'ROUTE-TO-VCN-S-HUB-KEY': {
                      priority: 10,
                      action: 'ACCEPT',

                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
                      },
                    },
                  },
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
                  import_drg_route_distribution_key: 'DRGRD-FRA-LZ-SPOKE-KEY',
                  is_ecmp_enabled: false,
                  route_rules: {},
                },
              },
            },
          },

          l7_load_balancers: lb._l7_lb,
        },
      },
    },
  },
}
