local common = import '../hub_common.libsonnet';
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
          'VCN-FRA-LZ-HUB-KEY': common._hub_vcn(ip.hub_a, {
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
            }) + {

            route_tables: {
              'RT-FRA-LZ-HUB-FW-DMZ-KEY': {
                display_name: 'rt-fra-lz-hub-fw-dmz',
                route_rules: common._internet_route_via_igw,
              },

              'RT-FRA-LZ-HUB-FW-INT-KEY': {
                display_name: 'rt-fra-lz-hub-fw-int',
                route_rules: common._internet_route_via_natgw,
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
                route_rules: common._services_route_via_sgw,
              },

              'RT-FRA-LZ-HUB-NATGW-KEY': {
                display_name: 'rt-fra-lz-hub-natgw',
                route_rules: {},
              },
            },

            default_security_list: common._empty_default_security_list,

            security_lists: common._icmp_sl('sl-fra-lz-hub-lb')
              + common._icmp_sl('sl-fra-lz-hub-fw-dmz')
              + common._icmp_sl('sl-fra-lz-hub-fw-int')
              + common._mgmt_security_list(ip.hub_a.bastion_ip),

            network_security_groups: lb._lb_nsg {
              'NSG-FRA-LZ-HUB-FW-DMZ-KEY': {
                display_name: 'nsg-fra-lz-hub-fw-dmz',

                egress_rules: common._nsg_egress_all_protocols {
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

                  https_443: {
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
                egress_rules: common._nsg_egress_all_protocols,
              },
            },

            vcn_specific_gateways: {
              internet_gateways: common._internet_gateway('igw-fra-lz-hub', route_table_key='RT-FRA-LZ-HUB-IGW-KEY'),
              nat_gateways: common._nat_gateway('ngw-fra-lz-hub', route_table_key='RT-FRA-LZ-HUB-NATGW-KEY'),
              service_gateways: common._service_gateway('sgw-fra-lz-hub'),
            },
          },
        },

        non_vcn_specific_gateways: {
          dynamic_routing_gateways: common._firewall_hub_drg,
          l7_load_balancers: lb._l7_load_balancer,
          network_firewalls_configuration: {
            network_firewall_policies: {
              'NFW-FRA-LZ-POLICY-DMZ-01-KEY': {
                display_name: 'nfw-fra-lz-policy-dmz-01',

                applications: nfw._nfw_applications,
                application_lists: nfw._nfw_application_lists,

                address_lists: {
                  'NFW-FRA-LZ-ADDRLIST-PUB-KEY': nfw._nfw_address_lists['NFW-FRA-LZ-ADDRLIST-PUB-KEY'],

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

            } + nfw._nfw_firewall_policy('nfw-fra-lz-policy-int-01'),

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
