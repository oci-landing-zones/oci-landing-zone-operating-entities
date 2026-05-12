// hub_e.libsonnet — Hub E builder (no firewall, DRG-only routing).
// Simplest hub: 4 subnets (LB, MGMT, MON, DNS), direct DRG spoke-to-spoke routing.
//
// function(hub_ctx) -> { pre, post, spoke_route_tables, post_route_tables, fw_nsg_key, has_spoke_natgw, post_route_entity_id, post_route_entity_desc }
//
// hub_ctx.naming: naming object from naming('fra')
// hub_ctx.hub_config: { kind: 'hub_e', network: { vcn: '...', subnets: { lb, mgmt, mon, dns } } }
// hub_ctx.lb_backends: { backend1_ip: '10.0.64.10', backend2_ip: '10.0.64.20' } — example LB backend IPs
// hub_ctx.lb_env_name: first ordered workload spoke name used for example LB naming
local common = import 'hub_common.libsonnet';
local lb = import 'hub_lb.libsonnet';

function(hub_ctx)
  local n = hub_ctx.naming;
  local hub_config = hub_ctx.hub_config;
  local lb_backends = if std.objectHas(hub_ctx, 'lb_backends') then hub_ctx.lb_backends else null;
  local lb_env_name = if std.objectHas(hub_ctx, 'lb_env_name') then hub_ctx.lb_env_name else 'prod';
  local vcn_cidr = hub_config.network.vcn;
  local subnets = hub_config.network.subnets;
  local bastion_ip = common.bastion_ip_from_mgmt(subnets.mgmt);
  local hub_route_tables = common._route_tables_from_descriptors(n, [
    {
      key_segments: ['HUB', 'LB'],
      display_segments: ['hub', 'lb'],
      route_rules: {
        [n.route_rule([n.region, 'internet'])]: common._route_via_key(
          'Route to the Internet through Internet GW',
          '0.0.0.0/0',
          n.key('IGW', ['HUB'])
        ),
      },
    },
    {
      key_segments: ['HUB', 'MGMT'],
      display_segments: ['hub', 'mgmt'],
      route_rules: common._internet_route_via_natgw(n) + common._services_route_via_sgw(n),
    },
  ]);

  common._hub_output(n, {
    hub_vcn: common._hub_vcn(n, vcn_cidr, subnets) + {
      route_tables: hub_route_tables,
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

      l7_load_balancers: lb._l7_load_balancer(n, lb_backends, lb_env_name),
    },

    spoke_route_tables: [
      n.key('RT', ['HUB', 'LB']),
      n.key('RT', ['HUB', 'MGMT']),
    ],
    post_route_tables: [],
    fw_nsg_key: null,
    has_spoke_natgw: true,
    post_route_entity_id: null,
    post_route_entity_desc: null,
  })
