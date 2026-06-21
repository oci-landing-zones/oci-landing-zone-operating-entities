// gen/builders/network_spokes.libsonnet
// Builds spoke network categories for shared project networks.
//
// function(inputs) -> { categories }

local common = import '../hub/hub_common.libsonnet';

function(inputs)
  local n = inputs.naming;
  local topo = inputs.topology;
  local hub_network = inputs.hub_network;
  local spoke_env_indexed = inputs.spoke_env_indexed;
  local all_peer_vcn_entries = inputs.all_peer_vcn_entries;
  local hub_has_spoke_natgw = inputs.hub_has_spoke_natgw;
  local hub_vcn_cidr = hub_network.vcn;
  local mgmt_cidr = hub_network.subnets.mgmt;
  local lb_cidr = hub_network.subnets.lb;

  // Builds a complete VCN category for one environment's shared project network.
  local spoke_category(entry, env_config, direct_spoke_peers=[]) =
    local key_segments = entry.key_segments;
    local display_segments = entry.display_segments;
    local dns_segments = entry.dns_segments;
    local has_natgw = hub_has_spoke_natgw;
    local spn = env_config.shared_project_network;
    local vcn_cidr = spn.network.vcn;
    local subnets = spn.network.subnets;
    local rt_key = n.key('RT', key_segments + ['PROJ', 'GENERIC']);
    local sl_key = n.key('SL', key_segments + ['PROJ', 'GENERIC']);
    local vcn_key = n.key('VCN', key_segments + ['PROJECTS']);
    local is_qualified = std.length(dns_segments) > 1;
    local vcn_dns_suffix = if is_qualified then 'pr' else 'proj';
    local subnet_dns_suffix(suffix) = if is_qualified then suffix[0:2] else suffix;

    local sn(suffix, cidr) = {
      [n.key('SN', key_segments + [suffix])]: {
        display_name: n.display('sn', display_segments + [suffix]),
        cidr_block: cidr,
        dns_label: n.dns_label(['sn', n.region, 'lz'] + dns_segments + [subnet_dns_suffix(suffix)]),
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: rt_key,
        security_list_keys: [sl_key],
      },
    };

    local hub_tcp_ingress_rule(description, src_cidr, port) =
      common._tcp_ingress_rule(description, src_cidr, port);

    local nsg_tcp_ingress_rule(description, src_nsg_key, port) =
      common._tcp_ingress_rule(description, src_nsg_key, port, src_type='NETWORK_SECURITY_GROUP');

    local project_names = topo.project_names(entry);

    local project_nsgs = std.foldl(
      function(acc, proj_name)
        local web_nsg_key = n.key('NSG', key_segments + [proj_name, 'WEB']);
        local app_nsg_key = n.key('NSG', key_segments + [proj_name, 'APP']);
        local db_nsg_key = n.key('NSG', key_segments + [proj_name, 'DB']);
        local proj_cmp = topo.env_project_compartment_key(entry, proj_name);
        acc {
        [web_nsg_key]: {
          compartment_id: proj_cmp,
          display_name: n.display('nsg', display_segments + [proj_name, 'web']),
          egress_rules: common._nsg_egress_tcp_only,
          ingress_rules: {
            http_80: hub_tcp_ingress_rule(
              'Allow inbound traffic from Hub LB subnet over HTTP',
              lb_cidr,
              80
            ),
            https_443: hub_tcp_ingress_rule(
              'Allow inbound traffic from Hub LB subnet over HTTPS',
              lb_cidr,
              443
            ),
            ssh_22: hub_tcp_ingress_rule(
              'Allow inbound traffic from Hub management subnet over SSH',
              mgmt_cidr,
              22
            ),
          },
        },
        [app_nsg_key]: {
          compartment_id: proj_cmp,
          display_name: n.display('nsg', display_segments + [proj_name, 'app']),
          egress_rules: common._nsg_egress_tcp_only,
          ingress_rules: {
            http_80: nsg_tcp_ingress_rule(
              'Allow inbound from NSG %s over HTTP' % n.display('nsg', display_segments + [proj_name, 'web']),
              web_nsg_key,
              80
            ),
            https_443: nsg_tcp_ingress_rule(
              'Allow inbound from NSG %s over HTTPS' % n.display('nsg', display_segments + [proj_name, 'web']),
              web_nsg_key,
              443
            ),
            ssh_22: hub_tcp_ingress_rule(
              'Allow inbound traffic from Hub management subnet over SSH',
              mgmt_cidr,
              22
            ),
          },
        },
        [db_nsg_key]: {
          compartment_id: proj_cmp,
          display_name: n.display('nsg', display_segments + [proj_name, 'db']),
          egress_rules: common._nsg_egress_tcp_only,
          ingress_rules: {
            db_1521: nsg_tcp_ingress_rule(
              'Allow inbound from NSG %s over TCP 1521' % n.display('nsg', display_segments + [proj_name, 'app']),
              app_nsg_key,
              1521
            ),
          },
        },
        },
      project_names,
      {}
    );

    local route_rules =
      {
        [n.route_rule([n.region, 'sgw'])]: {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: n.key('SGW', key_segments + ['PROJ']),
        },
      } + if has_natgw then
        {
          [n.route_rule([n.region, 'hub'])]: {
            description: 'Route to the Hub VCN through DRG',
            destination: hub_vcn_cidr,
            destination_type: 'CIDR_BLOCK',
            network_entity_key: n.key('DRG', ['HUB']),
          },
          [n.route_rule([n.region, 'natgw'])]: {
            description: 'Route to the Internet through NAT GW',
            destination: '0.0.0.0/0',
            destination_type: 'CIDR_BLOCK',
            network_entity_key: n.key('NGW', key_segments + ['PROJ']),
          },
        } + (if std.length(direct_spoke_peers) > 0 then {
               [p.route_key]: {
                 description:
                   if p.kind == 'spoke' then
                     'Route to the VCN %s Projects through DRG' % p.display
                   else
                     '%s through DRG' % p.route_desc,
                 destination: p.vcn,
                 destination_type: 'CIDR_BLOCK',
                 network_entity_key: n.key('DRG', ['HUB']),
               }
               for p in direct_spoke_peers
             } else {})
      else {
        [n.route_rule([n.region, 'drg'])]: {
          description: 'Route to the 0.0.0.0/0 through DRG',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: n.key('DRG', ['HUB']),
        },
      };

    {
      category_compartment_id: topo.env_child_compartment_key(entry, 'NETWORK'),
      vcns: {
        [vcn_key]: {
          display_name: n.display('vcn', display_segments + ['projects']),
          cidr_blocks: [vcn_cidr],
          dns_label: n.dns_label(['vcn', n.region, 'lz'] + dns_segments + [vcn_dns_suffix]),
          block_nat_traffic: false,
          is_attach_drg: false,
          is_create_igw: false,
          is_ipv6enabled: false,
          is_oracle_gua_allocation_enabled: false,
          default_security_list: {
            egress_rules: [],
            ingress_rules: [],
          },
          network_security_groups: project_nsgs,
          route_tables: {
            [rt_key]: {
              display_name: n.display('rt', display_segments + ['proj', 'generic']),
              route_rules: route_rules,
            },
          },
          security_lists: {
            [sl_key]: {
              display_name: n.display('sl', display_segments + ['proj', 'generic']),
              egress_rules: [
                {
                  description: 'Allow all outbound traffic to 0.0.0.0/0 over ALL protocols',
                  dst: '0.0.0.0/0',
                  dst_type: 'CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
                {
                  description: 'Allow outbound traffic to Oracle Services Network over ALL protocols',
                  dst: 'all-services',
                  dst_type: 'SERVICE_CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
              ],
              ingress_rules: common._icmp_ingress_rules(vcn_cidr, management_cidr=hub_vcn_cidr),
            },
          },
          subnets:
            sn('web', subnets.web)
            + sn('app', subnets.app)
            + sn('db', subnets.db)
            + sn('infra', subnets.infra),
          vcn_specific_gateways: {
            service_gateways: {
              [n.key('SGW', key_segments + ['PROJ'])]: {
                display_name: n.display('sgw', display_segments + ['proj']),
                services: 'all-services',
              },
            },
          } + if has_natgw then {
            nat_gateways: {
              [n.key('NGW', key_segments + ['PROJ'])]: {
                display_name: n.display('ngw', display_segments + ['proj']),
              },
            },
          } else {},
        },
      },
    };

  local categories = {
    ['%d-%s' % [s.index, s.entry.qualified_name]]: spoke_category(
      s.entry,
      s.env,
      local current_spoke_vcn_key = n.key('VCN', s.entry.key_segments + ['PROJECTS']);
      if hub_has_spoke_natgw then [
        p
        for p in all_peer_vcn_entries
        if p.vcn_key != current_spoke_vcn_key
      ] else []
    )
    for s in spoke_env_indexed
  };

  {
    categories: categories,
  }
