// hub_e.libsonnet — Hub E builder (no firewall, DRG-only routing).
// Simplest hub: 4 subnets (LB, MGMT, MON, DNS), direct DRG spoke-to-spoke routing.
//
// function(n, hub_config, vcn_list, lb_backends) -> { pre, post, spoke_route_tables, post_route_tables, fw_nsg_key, has_spoke_natgw, post_route_entity_id, post_route_entity_desc }
//
// n:          naming object from naming('fra')
// hub_config: { kind: 'hub_e', network: { vcn: '...', subnets: { lb, mgmt, mon, dns } } }
// vcn_list:   [{name: 'prod', cidr: '10.0.64.0/21'}, ...] — (unused by Hub E, no NFW)
// lb_backends: { backend1_ip: '10.0.64.10', backend2_ip: '10.0.64.20' } — example LB backend IPs
local common = import 'hub_common.libsonnet';
local lb = import 'hub_lb.libsonnet';

function(n, hub_config, vcn_list=[], lb_backends=null)
  local vcn_cidr = hub_config.network.vcn;
  local subnets = hub_config.network.subnets;
  local bastion_ip = common.bastion_ip_from_mgmt(subnets.mgmt);

  {
    pre: {
      network_configuration: {
        default_compartment_id: 'CMP-LZ-NETWORK-KEY',
        default_enable_cis_checks: false,

        network_configuration_categories: {
          '0-shared': {
            category_compartment_id: 'CMP-LZ-NETWORK-KEY',

            vcns: {
              [n.key('VCN', ['HUB'])]: common._hub_vcn(n, vcn_cidr, subnets) + {

                route_tables: {
                  [n.key('RT', ['HUB', 'LB'])]: {
                    display_name: n.display('rt', ['hub', 'lb']),
                    route_rules: {
                      [n.route_rule([n.region, 'internet'])]: {
                        description: 'Route to the Internet through Internet GW',
                        destination: '0.0.0.0/0',
                        destination_type: 'CIDR_BLOCK',
                        network_entity_key: n.key('IGW', ['HUB']),
                      },
                    },
                  },

                  [n.key('RT', ['HUB', 'MGMT'])]: {
                    display_name: n.display('rt', ['hub', 'mgmt']),
                    route_rules: common._internet_route_via_natgw(n) + common._services_route_via_sgw(n),
                  },
                },

                default_security_list: common._empty_default_security_list,

                security_lists: common._icmp_sl(n, ['HUB', 'LB'], vcn_cidr)
                  + common._mgmt_security_list(n, vcn_cidr, bastion_ip),

                network_security_groups: lb._lb_nsg(n),

                vcn_specific_gateways: {
                  internet_gateways: common._internet_gateway(n, ['HUB']),
                  nat_gateways: common._nat_gateway(n, ['HUB']),
                  service_gateways: common._service_gateway(n, ['HUB']),
                },
              },
            },

            non_vcn_specific_gateways: {
              dynamic_routing_gateways: {
                [n.key('DRG', ['HUB'])]: {
                  display_name: n.display('drg', ['hub']),

                  drg_attachments: {
                    [n.key('DRGATT', ['HUB', 'VCN'])]: {
                      display_name: n.display('drgatt', ['hub']),
                      drg_route_table_key: n.key('DRGRT', ['HUB']),

                      network_details: {
                        attached_resource_key: n.key('VCN', ['HUB']),
                        type: 'VCN',
                      },
                    },
                  },

                  drg_route_distributions: {
                    [n.key('DRGRD', ['HUB'])]: {
                      display_name: n.display('drgrd', ['hub']),
                      distribution_type: 'IMPORT',
                      statements: {},
                    },

                    [n.key('DRGRD', ['SPOKE'])]: {
                      display_name: n.display('drgrd', ['spoke']),
                      distribution_type: 'IMPORT',

                      statements: {
                        [n.key_global('ROUTE-TO-VCN', ['HUB'])]: {
                          priority: 10,
                          action: 'ACCEPT',

                          match_criteria: {
                            match_type: 'DRG_ATTACHMENT_ID',
                            attachment_type: 'VCN',
                            drg_attachment_key: n.key('DRGATT', ['HUB', 'VCN']),
                          },
                        },
                      },
                    },
                  },

                  drg_route_tables: {
                    [n.key('DRGRT', ['HUB'])]: {
                      display_name: n.display('drgrt', ['hub']),
                      import_drg_route_distribution_key: n.key('DRGRD', ['HUB']),
                      is_ecmp_enabled: false,
                      route_rules: {},
                    },

                    [n.key('DRGRT', ['SPOKES'])]: {
                      display_name: n.display('drgrt', ['spokes']),
                      import_drg_route_distribution_key: n.key('DRGRD', ['SPOKE']),
                      is_ecmp_enabled: false,
                      route_rules: {},
                    },
                  },
                },
              },

              l7_load_balancers: lb._l7_load_balancer(n, lb_backends),
            },
          },
        },
      },
    },

    post: null,

    spoke_route_tables: [
      n.key('RT', ['HUB', 'LB']),
      n.key('RT', ['HUB', 'MGMT']),
    ],

    post_route_tables: [],

    fw_nsg_key: null,

    has_spoke_natgw: true,

    post_route_entity_id: null,
    post_route_entity_desc: null,
  }
