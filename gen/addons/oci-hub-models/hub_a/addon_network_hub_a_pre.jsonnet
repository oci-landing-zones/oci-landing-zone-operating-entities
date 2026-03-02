local c = import '../hub_common.libsonnet';
local ip = import '../subnetting.libsonnet';
local lb = import '../hub_lb.libsonnet';
local nfw = import '../hub_nfw.libsonnet';

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
              'SN-FRA-LZ-HUB-FW-DMZ-KEY': {
                display_name: 'sn-fra-lz-hub-fw-dmz',
                dns_label: 'snfrahubfwdmz',
                cidr_block: ip.hub_a.fw_dmz_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-FRA-LZ-HUB-FW-DMZ-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-FW-DMZ-KEY'],
              },

              'SN-FRA-LZ-HUB-LB-KEY': {
                display_name: 'sn-fra-lz-hub-lb',
                dns_label: 'snfrahublb',
                cidr_block: ip.hub_a.lb_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: false,
                prohibit_public_ip_on_vnic: false,
                route_table_key: 'RT-FRA-LZ-HUB-LB-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-LB-KEY'],
              },

              'SN-FRA-LZ-HUB-FW-INT-KEY': {
                display_name: 'sn-fra-lz-hub-fw-int',
                dns_label: 'snfrahubfwint',
                cidr_block: ip.hub_a.fw_int_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-FW-INT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-FW-INT-KEY'],
              },

              'SN-FRA-LZ-HUB-MGMT-KEY': {
                display_name: 'sn-fra-lz-hub-mgmt',
                dns_label: 'snfrahubmgmt',
                cidr_block: ip.hub_a.mgmt_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },

              'SN-FRA-LZ-HUB-MON-KEY': {
                display_name: 'sn-fra-lz-hub-mon',
                dns_label: 'snfrahubmon',
                cidr_block: ip.hub_a.mon_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },

              'SN-FRA-LZ-HUB-DNS': {
                display_name: 'sn-fra-lz-hub-dns',
                dns_label: 'snfrahubdns',
                cidr_block: ip.hub_a.dns_sn,
                dhcp_options_key: 'default_dhcp_options',
                prohibit_internet_ingress: true,
                prohibit_public_ip_on_vnic: true,
                route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
                security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
              },
            },

            route_tables: {
              'RT-FRA-LZ-HUB-FW-DMZ-KEY': {
                display_name: 'rt-fra-lz-hub-fw-dmz',

                route_rules: {
                  'rt-igw': {
                    description: 'Route to the Internet through Internet GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'IGW-FRA-LZ-HUB-KEY',
                  },
                },
              },

              'RT-FRA-LZ-HUB-FW-INT-KEY': {
                display_name: 'rt-fra-lz-hub-fw-int',

                route_rules: {
                  'rt-natgw': {
                    description: 'Route to Internet through NAT GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-HUB-KEY',
                  },
                },
              },

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

              'RT-FRA-LZ-HUB-NATGW-KEY': {
                display_name: 'rt-fra-lz-hub-natgw',
                route_rules: {},
              },
            },

            default_security_list: {
              egress_rules: [],
              ingress_rules: [],
            },

            security_lists: {
              'SL-FRA-LZ-HUB-FW-DMZ-KEY': {
                display_name: 'sl-fra-lz-hub-fw-dmz',
                egress_rules: [],
                ingress_rules: c._sl_fw.ingress_rules,
              },

              'SL-FRA-LZ-HUB-FW-INT-KEY': {
                display_name: 'sl-fra-lz-hub-fw-int',
                egress_rules: [],
                ingress_rules: c._sl_fw.ingress_rules,
              },

              'SL-FRA-LZ-HUB-LB-KEY': lb._sl_lb['SL-FRA-LZ-HUB-LB-KEY'],

              'SL-FRA-LZ-HUB-MGMT-KEY': c._sl_mgmt(ip.hub_a.bastion_ip),
            },

            network_security_groups: {
              'NSG-FRA-LZ-HUB-FW-DMZ-KEY': {
                display_name: 'nsg-fra-lz-hub-fw-dmz',

                egress_rules: {
                  anywhere: {
                    description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
                    dst: '0.0.0.0/0',
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: false,
                  },

                  to_lb: {
                    description: 'Allow all outbound traffic to LB subnet over all protocols',
                    dst: ip.hub_a.lb_sn,
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: true,
                  },
                },

                ingress_rules: {
                  from_lb: {
                    description: 'Allow inbound traffic from Hub LB subnet over all protocols',
                    src: ip.hub_a.lb_sn,
                    src_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: true,
                  },

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

              'NSG-FRA-LZ-HUB-FW-INT-KEY': {
                display_name: 'nsg-fra-lz-hub-fw-int',
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

              'NSG-FRA-LZ-HUB-LB-KEY': lb._nsg_lb['NSG-FRA-LZ-HUB-LB-KEY'],
            },

            vcn_specific_gateways: {
              internet_gateways: {
                'IGW-FRA-LZ-HUB-KEY': {
                  display_name: 'igw-fra-lz-hub',
                  route_table_key: 'RT-FRA-LZ-HUB-IGW-KEY',
                },
              },

              nat_gateways: {
                'NGW-FRA-LZ-HUB-KEY': {
                  display_name: 'ngw-fra-lz-hub',
                  route_table_key: 'RT-FRA-LZ-HUB-NATGW-KEY',
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

          network_firewalls_configuration: {
            network_firewall_policies: {
              'NFW-FRA-LZ-POLICY-DMZ-01-KEY': {
                display_name: 'nfw-fra-lz-policy-dmz-01',

                address_lists: {
                  'NFW-FRA-LZ-ADDRLIST-LB-KEY': {
                    name: 'nfw-fra-lz-addrlist-lb',
                    type: 'IP',
                    addresses: [ip.hub_a.lb_sn],
                  },
                },

                security_rules: {
                  'NFW-FRA-LZ-SEC-RULE-01-KEY': {
                    name: 'secrule-allow-http-inbound2lb',
                    action: 'ALLOW',
                    destination_address_lists: ['NFW-FRA-LZ-ADDRLIST-LB-KEY'],
                    service_lists: ['NFW-FRA-LZ-SERLIST-01-KEY'],
                  },
                },

                service_lists: nfw._nfw_service_lists,
                services: nfw._nfw_services,
              },

              'NFW-FRA-LZ-POLICY-INT-01-KEY': { display_name: 'nfw-fra-lz-policy-int-01' }
                + nfw._nfw_spoke_policy,
            },

            network_firewalls: {
              'NFW-FRA-LZ-HUB-DMZ-KEY': {
                display_name: 'nfw-fra-lz-hub-dmz',
                ipv4address: ip.hub_a.nfw_dmz_ip,
                network_firewall_policy_key: 'NFW-FRA-LZ-POLICY-DMZ-01-KEY',
                network_security_group_keys: ['NSG-FRA-LZ-HUB-FW-DMZ-KEY'],
                subnet_key: 'SN-FRA-LZ-HUB-FW-DMZ-KEY',
              },

              'NFW-FRA-LZ-HUB-INT-KEY': {
                display_name: 'nfw-fra-lz-hub-int',
                ipv4address: ip.hub_a.nfw_int_ip,
                network_firewall_policy_key: 'NFW-FRA-LZ-POLICY-INT-01-KEY',
                network_security_group_keys: ['NSG-FRA-LZ-HUB-FW-INT-KEY'],
                subnet_key: 'SN-FRA-LZ-HUB-FW-INT-KEY',
              },
            },
          },
        },
      },
    },
  },
}
