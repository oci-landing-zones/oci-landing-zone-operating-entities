local common = import '../hub_common.libsonnet';
local ip = import '../subnetting.libsonnet';
local lb = import '../hub_lb.libsonnet';
local hub_c_nlb = import 'hub_c_nlb.libsonnet';

{
  network_configuration: {
    default_compartment_id: 'CMP-LZ-NETWORK-KEY',
    default_enable_cis_checks: false,

    network_configuration_categories: {
      '0-shared': {
        category_compartment_id: 'CMP-LZ-NETWORK-KEY',

        vcns: {
          'VCN-FRA-LZ-HUB-KEY': common._hub_vcn(ip.hub_c, {
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
            }) + {

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
                route_rules: common._services_route_via_sgw,
              },

              'RT-FRA-LZ-HUB-TRUST-KEY': {
                display_name: 'rt-fra-lz-hub-trust',
                route_rules: {},
              },

              'RT-FRA-LZ-HUB-UNTRUST-KEY': {
                display_name: 'rt-fra-lz-hub-untrust',
                route_rules: common._internet_route_via_igw,
              },
            },

            default_security_list: common._empty_default_security_list,

            security_lists: common._icmp_sl('sl-fra-lz-hub-lb')
              + common._icmp_sl('sl-fra-lz-hub-trust')
              + common._icmp_sl('sl-fra-lz-hub-untrust')
              + common._mgmt_security_list(ip.hub_c.bastion_ip),

            network_security_groups: {
              'NSG-FRA-LZ-HUB-LB-KEY': {
                display_name: 'nsg-fra-lz-hub-lb',
                egress_rules: common._nsg_egress_tcp_only,

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
                egress_rules: common._nsg_egress_all_protocols,

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
                egress_rules: common._nsg_egress_all_protocols,
              },

              'NSG-FRA-LZ-HUB-UNTRUST-FW-KEY': {
                display_name: 'nsg-fra-lz-hub-untrust-fw',
                egress_rules: common._nsg_egress_all_protocols,

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
                egress_rules: common._nsg_egress_all_protocols,

                ingress_rules: {
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
            },

            vcn_specific_gateways: {
              internet_gateways: common._internet_gateway('igw-fra-lz-hub', route_table_key='RT-FRA-LZ-HUB-IGW-KEY'),

              service_gateways: common._service_gateway('sgw-fra-lz-hub'),
            },
          },
        },

        non_vcn_specific_gateways: {
          dynamic_routing_gateways: common._firewall_hub_drg,

          l7_load_balancers: lb._l7_load_balancer,
        },
      },
    },
  },

  nlb_configuration: {
    default_compartment_id: 'CMP-LZ-NETWORK-KEY',

    nlbs: hub_c_nlb._nlb('trust') + hub_c_nlb._nlb('untrust'),
  },
}
