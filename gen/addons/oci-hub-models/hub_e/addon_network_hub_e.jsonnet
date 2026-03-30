local common = import '../hub_common.libsonnet';
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
          'VCN-FRA-LZ-HUB-KEY': common._hub_vcn(ip.hub_e) + {

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
                route_rules: common._internet_route_via_natgw + common._services_route_via_sgw,
              },
            },

            default_security_list: common._empty_default_security_list,

            security_lists: common._icmp_sl('sl-fra-lz-hub-lb')
              + common._mgmt_security_list(ip.hub_e.bastion_ip),

            network_security_groups: lb._lb_nsg,

            vcn_specific_gateways: {
              internet_gateways: common._internet_gateway('igw-fra-lz-hub'),
              nat_gateways: common._nat_gateway('ngw-fra-lz-hub'),
              service_gateways: common._service_gateway('sgw-fra-lz-hub'),
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
                    'ROUTE-TO-VCN-HUB-KEY': {
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

          l7_load_balancers: lb._l7_load_balancer,
        },
      },
    },
  },
}
