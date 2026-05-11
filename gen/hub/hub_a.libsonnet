// hub_a.libsonnet — Hub A builder (dual-firewall: DMZ NFW + Internal NFW).
// Subnets: fw-dmz, lb, fw-int, mgmt, mon, dns.
// DRG ingress route table, two OCI Network Firewalls, L7 LB.
//
// function(hub_ctx) -> { pre, post, spoke_route_tables, post_route_tables, fw_nsg_key, has_spoke_natgw, post_route_entity_id, post_route_entity_desc }
//
// hub_ctx.naming: naming object from naming('fra')
// hub_ctx.hub_config: { kind: 'hub_a', network: { vcn: '...', subnets: { 'fw-dmz', lb, 'fw-int', mgmt, mon, dns } } }
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
  local nfw_dmz_ip = common.nfw_ip_from_subnet(subnets['fw-dmz']);
  local nfw_int_ip = common.nfw_ip_from_subnet(subnets['fw-int']);

  // Placeholder OCID strings for post-deployment routes
  local nfw_dmz_ocid = 'DMZ OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.vrdnynvr...';
  local nfw_int_ocid = 'Internal OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljs...';
  local hub_route_tables = common._route_tables_from_descriptors(n, [
    {
      key_segments: ['HUB', 'FW', 'DMZ'],
      display_segments: ['hub', 'fw', 'dmz'],
      route_rules: common._internet_route_via_igw(n),
    },
    {
      key_segments: ['HUB', 'FW', 'INT'],
      display_segments: ['hub', 'fw', 'int'],
      route_rules: common._internet_route_via_natgw(n),
    },
    {
      key_segments: ['HUB', 'IGW'],
      display_segments: ['hub', 'igw'],
      route_rules: {},
    },
    {
      key_segments: ['HUB', 'INGRESS'],
      display_segments: ['hub', 'ingress'],
      route_rules: {},
    },
    {
      key_segments: ['HUB', 'LB'],
      display_segments: ['hub', 'lb'],
      route_rules: {},
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
                [n.key('SN', ['HUB', 'FW', 'DMZ'])]: {
                  display_name: n.display('sn', ['hub', 'fw', 'dmz']),
                  dns_label: n.dns_label(['sn', n.region, 'hub', 'fwdmz']),
                  cidr_block: subnets['fw-dmz'],
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: false,
                  prohibit_public_ip_on_vnic: false,
                  route_table_key: n.key('RT', ['HUB', 'FW', 'DMZ']),
                  security_list_keys: [n.key('SL', ['HUB', 'FW', 'DMZ'])],
                },

                [n.key('SN', ['HUB', 'FW', 'INT'])]: {
                  display_name: n.display('sn', ['hub', 'fw', 'int']),
                  dns_label: n.dns_label(['sn', n.region, 'hub', 'fwint']),
                  cidr_block: subnets['fw-int'],
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: true,
                  prohibit_public_ip_on_vnic: true,
                  route_table_key: n.key('RT', ['HUB', 'FW', 'INT']),
                  security_list_keys: [n.key('SL', ['HUB', 'FW', 'INT'])],
                },
              }) + {

                route_tables: hub_route_tables,

                default_security_list: common._empty_default_security_list,

                security_lists: common._icmp_sl(n, ['HUB', 'LB'], vcn_cidr)
                  + common._icmp_sl(n, ['HUB', 'FW', 'DMZ'], vcn_cidr)
                  + common._icmp_sl(n, ['HUB', 'FW', 'INT'], vcn_cidr)
                  + common._mgmt_security_list(n, vcn_cidr, bastion_ip),

                network_security_groups: lb._lb_nsg(n) {
                  [n.key('NSG', ['HUB', 'FW', 'DMZ'])]: {
                    display_name: n.display('nsg', ['hub', 'fw', 'dmz']),

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

                      https_443: common._tcp_ingress_rule(
                        'Allow inbound traffic from 0.0.0.0/0 over HTTPS',
                        '0.0.0.0/0',
                        443
                      ),

                      http_80: common._tcp_ingress_rule(
                        'Allow inbound traffic from 0.0.0.0/0 over HTTP',
                        '0.0.0.0/0',
                        80
                      ),
                    },
                  },

                  [n.key('NSG', ['HUB', 'FW', 'INT'])]: {
                    display_name: n.display('nsg', ['hub', 'fw', 'int']),
                    ingress_rules: {},
                    egress_rules: common._nsg_egress_all_protocols,
                  },
                },

                vcn_specific_gateways: {
                  internet_gateways: common._internet_gateway(n, ['HUB'], route_table_key=n.key('RT', ['HUB', 'IGW'])),
                  nat_gateways: common._nat_gateway(n, ['HUB'], route_table_key=n.key('RT', ['HUB', 'NATGW'])),
                  service_gateways: common._service_gateway(n, ['HUB']),
                },
              },
            },

            non_vcn_specific_gateways: {
              dynamic_routing_gateways: common._firewall_hub_drg(n),
              l7_load_balancers: lb._l7_load_balancer(n, lb_backends, lb_env_name),
              network_firewalls_configuration: {
                network_firewall_policies: {
                  [n.key('NFW', ['POLICY', 'DMZ', '01'])]: {
                    display_name: n.display('nfw', ['policy', 'dmz', '01']),

                    applications: nfw._nfw_applications(n),
                    application_lists: nfw._nfw_application_lists(n),

                    address_lists: {
                      [n.key('NFW', ['ADDRLIST', 'PUB'])]: {
                        name: n.display('nfw', ['addrlist', 'public']),
                        type: 'IP',
                        addresses: ['0.0.0.0/0'],
                      },

                      [n.key('NFW', ['ADDRLIST', 'LB'])]: {
                        name: n.display('nfw', ['addrlist', 'lb']),
                        type: 'IP',
                        addresses: [subnets.lb],
                      },
                    },

                    security_rules: {
                      [n.key('NFW', ['SEC', 'RULE', '01'])]: {
                        name: 'secrule-allow-http-inbound2lb',
                        action: 'ALLOW',
                        destination_address_lists: [n.key('NFW', ['ADDRLIST', 'LB'])],
                        service_lists: [n.key('NFW', ['SERLIST', '01'])],
                      },
                    },

                    service_lists: nfw._nfw_service_lists(n),
                    services: nfw._nfw_services(n),
                  },
                } + nfw._nfw_firewall_policy(n, vcn_list, policy_segments=['INT']),

                network_firewalls: {
                  [n.key('NFW', ['HUB', 'DMZ'])]: {
                    display_name: n.display('nfw', ['hub', 'dmz']),
                    ipv4address: nfw_dmz_ip,
                    network_firewall_policy_key: n.key('NFW', ['POLICY', 'DMZ', '01']),
                    network_security_group_keys: [n.key('NSG', ['HUB', 'FW', 'DMZ'])],
                    subnet_key: n.key('SN', ['HUB', 'FW', 'DMZ']),
                  },

                  [n.key('NFW', ['HUB', 'INT'])]: {
                    display_name: n.display('nfw', ['hub', 'int']),
                    ipv4address: nfw_int_ip,
                    network_firewall_policy_key: n.key('NFW', ['POLICY', 'INT', '01']),
                    network_security_group_keys: [n.key('NSG', ['HUB', 'FW', 'INT'])],
                    subnet_key: n.key('SN', ['HUB', 'FW', 'INT']),
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
                  [n.key('RT', ['HUB', 'IGW'])]+: {
                    route_rules: {
                      [n.route_rule(['vcn', n.region, 'hub', 'lb', 'sn'])]: common._route_via_id(
                        'Route to lb subnet in Hub VCN through DMZ OCI Network Firewall',
                        subnets.lb,
                        nfw_dmz_ocid
                      ),
                    },
                  },

                  [n.key('RT', ['HUB', 'INGRESS'])]+: {
                    route_rules: {
                      [n.route_rule([n.region, 'internet'])]: common._route_via_id(
                        'Route to the Internet through the Internal OCI Network Firewall',
                        '0.0.0.0/0',
                        nfw_int_ocid
                      ),
                    },
                  },

                  [n.key('RT', ['HUB', 'LB'])]+: {
                    route_rules+: {
                      [n.route_rule([n.region, 'internet'])]: common._route_via_id(
                        'Route to the Internet through the DMZ Firewall',
                        '0.0.0.0/0',
                        nfw_dmz_ocid
                      ),
                    },
                  },

                  [n.key('RT', ['HUB', 'MGMT'])]+: {
                    route_rules+: {
                      [n.route_rule([n.region, 'internet'])]: common._route_via_id(
                        'Route to the Internet through the Internal OCI Network Firewall',
                        '0.0.0.0/0',
                        nfw_int_ocid
                      ),
                    },
                  },

                  [n.key('RT', ['HUB', 'NATGW'])]+: {
                    route_rules: common._natgw_firewall_routes(n, subnets, nfw_int_ocid, 'Internal OCI Network Firewall'),
                  },
                },
              },
            },
          },
        },
      },
    },

    spoke_route_tables: [
      n.key('RT', ['HUB', 'LB']),
      n.key('RT', ['HUB', 'FW', 'INT']),
      n.key('RT', ['HUB', 'MGMT']),
    ],

    post_route_tables: [
      n.key('RT', ['HUB', 'INGRESS']),
      n.key('RT', ['HUB', 'NATGW']),
    ],

    fw_nsg_key: n.key('NSG', ['HUB', 'FW', 'INT']),

    has_spoke_natgw: false,

    post_route_entity_id: nfw_int_ocid,
    post_route_entity_desc: 'Internal OCI Network Firewall',
  }
