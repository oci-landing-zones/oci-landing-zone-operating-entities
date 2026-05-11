// hub_b.libsonnet — Hub B builder (single-firewall: one OCI NFW).
// Subnets: lb, fw, mgmt, mon, dns.
// DRG ingress route table, one OCI Network Firewall, L7 LB.
//
// function(hub_ctx) -> { pre, post, spoke_route_tables, post_route_tables, fw_nsg_key, has_spoke_natgw, post_route_entity_id, post_route_entity_desc }
//
// hub_ctx.naming: naming object from naming('fra')
// hub_ctx.hub_config: { kind: 'hub_b', network: { vcn: '...', subnets: { lb, fw, mgmt, mon, dns } } }
// hub_ctx.vcn_list: [{name: 'prod', cidr: '10.0.64.0/21'}, ...] — spoke/platform VCN CIDRs for NFW policies
// hub_ctx.lb_backends: { backend1_ip: '10.0.64.10', backend2_ip: '10.0.64.20' } — example LB backend IPs
// hub_ctx.lb_env_name: first ordered workload spoke name used for example LB naming
local common = import 'hub_common.libsonnet';
local lb = import 'hub_lb.libsonnet';
local nfw = import 'hub_nfw.libsonnet';

function(hub_ctx)
  local n = hub_ctx.naming;
  local hub_config = hub_ctx.hub_config;
  local vcn_list = if std.objectHas(hub_ctx, 'vcn_list') then hub_ctx.vcn_list else [];
  local lb_backends = if std.objectHas(hub_ctx, 'lb_backends') then hub_ctx.lb_backends else null;
  local lb_env_name = if std.objectHas(hub_ctx, 'lb_env_name') then hub_ctx.lb_env_name else 'prod';
  local vcn_cidr = hub_config.network.vcn;
  local subnets = hub_config.network.subnets;
  local bastion_ip = common.bastion_ip_from_mgmt(subnets.mgmt);
  local nfw_ip = common.nfw_ip_from_subnet(subnets.fw);

  // Placeholder OCID string for post-deployment routes
  local nfw_ocid = 'OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljs...';
  local hub_route_tables = common._route_tables_from_descriptors(n, [
    {
      key_segments: ['HUB', 'FW'],
      display_segments: ['hub', 'fw'],
      route_rules: common._internet_route_via_natgw(n),
    },
    {
      key_segments: ['HUB', 'INGRESS'],
      display_segments: ['hub', 'ingress'],
      route_rules: {},
    },
    {
      key_segments: ['HUB', 'LB'],
      display_segments: ['hub', 'lb'],
      route_rules: {
        [n.route_rule([n.region, 'internet'])]:
          common._route_via_key(
            'Route to the Internet through Internet GW',
            '0.0.0.0/0',
            n.key('IGW', ['HUB'])
          ),
      },
    },
    {
      key_segments: ['HUB', 'MGMT'],
      display_segments: ['hub', 'mgmt'],
      route_rules: common._services_route_via_sgw(n),
    },
    {
      key_segments: ['HUB', 'NATGW'],
      display_segments: ['hub', 'natgw'],
      route_rules: {},
    },
  ]);

  {
    pre: {
      network_configuration: {
        default_compartment_id: 'CMP-LZ-NETWORK-KEY',
        default_enable_cis_checks: false,

        network_configuration_categories: {
          '0-shared': {
            category_compartment_id: 'CMP-LZ-NETWORK-KEY',

            vcns: {
              [n.key('VCN', ['HUB'])]: common._hub_vcn(n, vcn_cidr, subnets, {
                [n.key('SN', ['HUB', 'FW'])]: {
                  display_name: n.display('sn', ['hub', 'fw']),
                  dns_label: n.dns_label(['sn', n.region, 'hub', 'fw']),
                  cidr_block: subnets.fw,
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: true,
                  prohibit_public_ip_on_vnic: true,
                  route_table_key: n.key('RT', ['HUB', 'FW']),
                  security_list_keys: [n.key('SL', ['HUB', 'FW'])],
                },
              }) + {

                route_tables: hub_route_tables,

                default_security_list: common._empty_default_security_list,

                security_lists: common._icmp_sl(n, ['HUB', 'LB'], vcn_cidr)
                  + common._icmp_sl(n, ['HUB', 'FW'], vcn_cidr)
                  + common._mgmt_security_list(n, vcn_cidr, bastion_ip),

                network_security_groups: lb._lb_nsg(n) {
                  [n.key('NSG', ['HUB', 'FW'])]: {
                    display_name: n.display('nsg', ['hub', 'fw']),

                    egress_rules: common._nsg_egress_all_protocols {
                      to_lb: {
                        description: 'Allow all outbound traffic to LB subnet over all protocols',
                        dst: subnets.lb,
                        dst_type: 'CIDR_BLOCK',
                        protocol: 'ALL',
                        stateless: true,
                      },
                    },

                    ingress_rules: {
                      from_lb: {
                        description: 'Allow inbound traffic from Hub LB subnet over all protocols',
                        src: subnets.lb,
                        src_type: 'CIDR_BLOCK',
                        protocol: 'ALL',
                        stateless: true,
                      },
                    },
                  },
                },

                vcn_specific_gateways: {
                  internet_gateways: common._internet_gateway(n, ['HUB']),
                  nat_gateways: common._nat_gateway(n, ['HUB'], route_table_key=n.key('RT', ['HUB', 'NATGW'])),
                  service_gateways: common._service_gateway(n, ['HUB']),
                },
              },
            },

            non_vcn_specific_gateways: {
              dynamic_routing_gateways: common._firewall_hub_drg(n),

              l7_load_balancers: lb._l7_load_balancer(n, lb_backends, lb_env_name),

              network_firewalls_configuration: {
                network_firewall_policies: nfw._nfw_firewall_policy(
                  n,
                  vcn_list,
                  extras=[
                    {
                      name: 'secrule-allow-lb2spokes',
                      action: 'ALLOW',
                      destination_address_lists: [n.key('NFW', ['ADDRLIST', 'SPOKES'])],
                      service_lists: [n.key('NFW', ['SERLIST', '01'])],
                      source_address_lists: [n.key('NFW', ['ADDRLIST', 'LB'])],
                    },
                  ],
                  extra_address_lists={
                    [n.key('NFW', ['ADDRLIST', 'LB'])]: {
                      name: n.display('nfw', ['addrlist', 'lb']),
                      type: 'IP',
                      addresses: [subnets.lb],
                    },
                  },
                ),

                network_firewalls: {
                  [n.key('NFW', ['HUB'])]: {
                    display_name: n.display('nfw', ['hub']),
                    ipv4address: nfw_ip,
                    network_firewall_policy_key: n.key('NFW', ['POLICY', '01']),
                    network_security_group_keys: [n.key('NSG', ['HUB', 'FW'])],
                    subnet_key: n.key('SN', ['HUB', 'FW']),
                  },
                },
              },
            },
          },
        },
      },
    },

    post: {
      network_configuration+: {
        network_configuration_categories+: {
          '0-shared'+: {
            vcns+: {
              [n.key('VCN', ['HUB'])]+: {
                route_tables+: {
                  [n.key('RT', ['HUB', 'INGRESS'])]+: {
                    route_rules: {
                      [n.route_rule([n.region, 'internet'])]: common._route_via_id(
                        'Route to the Internet through the OCI Network Firewall',
                        '0.0.0.0/0',
                        nfw_ocid
                      ),

                      [n.route_rule(['vcn', n.region, 'hub', 'lb', 'sn'])]: common._route_via_id(
                        'Route to Public LB through the OCI Network Firewall',
                        subnets.lb,
                        nfw_ocid
                      ),
                    },
                  },

                  [n.key('RT', ['HUB', 'MGMT'])]+: {
                    route_rules+: {
                      [n.route_rule([n.region, 'internet'])]: common._route_via_id(
                        'Route to the Internet through the OCI Network Firewall',
                        '0.0.0.0/0',
                        nfw_ocid
                      ),
                    },
                  },

                  [n.key('RT', ['HUB', 'NATGW'])]+: {
                    route_rules: common._natgw_firewall_routes(n, subnets, nfw_ocid, 'OCI Network Firewall'),
                  },
                },
              },
            },
          },
        },
      },
    },

    spoke_route_tables: [
      n.key('RT', ['HUB', 'FW']),
      n.key('RT', ['HUB', 'MGMT']),
    ],

    post_route_tables: [
      n.key('RT', ['HUB', 'INGRESS']),
      n.key('RT', ['HUB', 'NATGW']),
      n.key('RT', ['HUB', 'LB']),
    ],

    fw_nsg_key: n.key('NSG', ['HUB', 'FW']),

    has_spoke_natgw: false,

    post_route_entity_id: nfw_ocid,
    post_route_entity_desc: 'OCI Network Firewall',
  }
