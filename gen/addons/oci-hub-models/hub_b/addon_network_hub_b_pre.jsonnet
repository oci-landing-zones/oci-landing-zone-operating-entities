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
          'VCN-FRA-LZ-HUB-KEY': common._hub_vcn(ip.hub_b, {
                'SN-FRA-LZ-HUB-FW-KEY': {
                  display_name: 'sn-fra-lz-hub-fw',
                  dns_label: 'snfrahubfw',
                  cidr_block: ip.hub_b.fw_sn,
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: true,
                  prohibit_public_ip_on_vnic: true,
                  route_table_key: 'RT-FRA-LZ-HUB-FW-KEY',
                  security_list_keys: ['SL-FRA-LZ-HUB-FW-KEY'],
                },
              }) + {

            route_tables: {
              'RT-FRA-LZ-HUB-FW-KEY': {
                display_name: 'rt-fra-lz-hub-fw',
                route_rules: common._internet_route_via_natgw,
              },

              'RT-FRA-LZ-HUB-INGRESS-KEY': {
                display_name: 'rt-fra-lz-hub-ingress',
                route_rules: {},
              },

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
                route_rules: common._services_route_via_sgw,
              },

              'RT-FRA-LZ-HUB-NATGW-KEY': {
                display_name: 'rt-fra-lz-hub-natgw',
                route_rules: {},
              },
            },

            default_security_list: common._empty_default_security_list,

            security_lists: common._icmp_sl('sl-fra-lz-hub-lb')
              + common._icmp_sl('sl-fra-lz-hub-fw')
              + common._mgmt_security_list(ip.hub_b.bastion_ip),

            network_security_groups: lb._lb_nsg {
              'NSG-FRA-LZ-HUB-FW-KEY': {
                display_name: 'nsg-fra-lz-hub-fw',

                egress_rules: common._nsg_egress_all_protocols {
                  to_lb: {
                    description: 'Allow all outbound traffic to LB subnet over all protocols',
                    dst: ip.hub_b.lb_sn,
                    dst_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: true,
                  },
                },

                ingress_rules: {
                  from_lb: {
                    description: 'Allow inbound traffic from Hub LB subnet over all protocols',
                    src: ip.hub_b.lb_sn,
                    src_type: 'CIDR_BLOCK',
                    protocol: 'ALL',
                    stateless: true,
                  },
                },
              },
            },

            vcn_specific_gateways: {
              internet_gateways: common._internet_gateway('igw-fra-lz-hub'),

              nat_gateways: common._nat_gateway('ngw-fra-lz-hub', route_table_key='RT-FRA-LZ-HUB-NATGW-KEY'),

              service_gateways: common._service_gateway('sgw-fra-lz-hub'),
            },
          },
        },

        non_vcn_specific_gateways: {
          dynamic_routing_gateways: common._firewall_hub_drg,

          l7_load_balancers: lb._l7_load_balancer,

          network_firewalls_configuration: {
            network_firewall_policies: nfw._nfw_firewall_policy(
              'nfw-fra-lz-policy-01',
              extra_rules=[
                {
                  name: 'secrule-allow-lb2spokes',
                  action: 'ALLOW',
                  destination_address_lists: ['NFW-FRA-LZ-ADDRLIST-SPOKES-KEY'],
                  service_lists: ['NFW-FRA-LZ-SERLIST-01-KEY'],
                  source_address_lists: ['NFW-FRA-LZ-ADDRLIST-LB-KEY'],
                },
              ],
              extra_address_lists={
                'NFW-FRA-LZ-ADDRLIST-LB-KEY': {
                  name: 'nfw-fra-lz-addrlist-lb',
                  type: 'IP',
                  addresses: [ip.hub_b.lb_sn],
                },
              }),

            network_firewalls: {
              'NFW-FRA-LZ-HUB-KEY': {
                display_name: 'nfw-fra-lz-hub',
                ipv4address: ip.hub_b.nfw_ip,
                network_firewall_policy_key: 'NFW-FRA-LZ-POLICY-01-KEY',
                network_security_group_keys: ['NSG-FRA-LZ-HUB-FW-KEY'],
                subnet_key: 'SN-FRA-LZ-HUB-FW-KEY',
              },
            },
          },
        },
      },
    },
  },
}
