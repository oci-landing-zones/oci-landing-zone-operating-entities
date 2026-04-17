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
  local spoke_category(env_name, env_config, direct_spoke_peers=[]) =
    local dns = topo.env_dns(env_name);
    local has_natgw = hub_has_spoke_natgw;
    local spn = env_config.shared_project_network;
    local vcn_cidr = spn.network.vcn;
    local subnets = spn.network.subnets;
    local rt_key = n.key('RT', [env_name, 'PROJ', 'GENERIC']);
    local sl_key = n.key('SL', [env_name, 'PROJ', 'GENERIC']);

    local sn(suffix, cidr) = {
      [n.key('SN', [env_name, suffix])]: {
        display_name: n.display('sn', [env_name, suffix]),
        cidr_block: cidr,
        dns_label: n.dns_label(['sn', n.region, 'lz', dns, suffix]),
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: rt_key,
        security_list_keys: [sl_key],
      },
    };

    local hub_tcp_ingress_rule(description, src_cidr, port) = {
      description: description,
      src: src_cidr,
      src_type: 'CIDR_BLOCK',
      dst_port_max: port,
      dst_port_min: port,
      protocol: 'TCP',
      stateless: false,
    };

    local nsg_tcp_ingress_rule(description, src_nsg_key, port) = {
      description: description,
      src: src_nsg_key,
      src_type: 'NETWORK_SECURITY_GROUP',
      dst_port_max: port,
      dst_port_min: port,
      protocol: 'TCP',
      stateless: false,
    };

    local project_names = if std.objectHas(env_config, 'projects')
    then std.objectFields(env_config.projects)
    else [];

    local project_nsgs = std.foldl(
      function(acc, proj_name)
        local web_nsg_key = n.key('NSG', [env_name, proj_name, 'WEB']);
        local app_nsg_key = n.key('NSG', [env_name, proj_name, 'APP']);
        local db_nsg_key = n.key('NSG', [env_name, proj_name, 'DB']);
        local proj_cmp = n.key_global('CMP', [env_name, proj_name]);
        acc {
        [web_nsg_key]: {
          compartment_id: proj_cmp,
          display_name: n.display('nsg', [env_name, proj_name, 'web']),
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
          display_name: n.display('nsg', [env_name, proj_name, 'app']),
          egress_rules: common._nsg_egress_tcp_only,
          ingress_rules: {
            http_80: nsg_tcp_ingress_rule(
              'Allow inbound from NSG %s over HTTP' % n.display('nsg', [env_name, proj_name, 'web']),
              web_nsg_key,
              80
            ),
            https_443: nsg_tcp_ingress_rule(
              'Allow inbound from NSG %s over HTTPS' % n.display('nsg', [env_name, proj_name, 'web']),
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
          display_name: n.display('nsg', [env_name, proj_name, 'db']),
          egress_rules: common._nsg_egress_tcp_only,
          ingress_rules: {
            db_1521: nsg_tcp_ingress_rule(
              'Allow inbound from NSG %s over TCP 1521' % n.display('nsg', [env_name, proj_name, 'app']),
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
          network_entity_key: n.key('SGW', [env_name, 'PROJ']),
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
            network_entity_key: n.key('NGW', [env_name, 'PROJ']),
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
      category_compartment_id: n.key_global('CMP', [env_name, 'NETWORK']),
      vcns: {
        [n.key('VCN', [env_name, 'PROJECTS'])]: {
          display_name: n.display('vcn', [env_name, 'projects']),
          cidr_blocks: [vcn_cidr],
          dns_label: n.dns_label(['vcn', n.region, 'lz', dns, 'proj']),
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
              display_name: n.display('rt', [env_name, 'proj', 'generic']),
              route_rules: route_rules,
            },
          },
          security_lists: {
            [sl_key]: {
              display_name: n.display('sl', [env_name, 'proj', 'generic']),
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
              [n.key('SGW', [env_name, 'PROJ'])]: {
                display_name: n.display('sgw', [env_name, 'proj']),
                services: 'all-services',
              },
            },
          } + if has_natgw then {
            nat_gateways: {
              [n.key('NGW', [env_name, 'PROJ'])]: {
                display_name: n.display('ngw', [env_name, 'proj']),
              },
            },
          } else {},
        },
      },
    };

  local categories = {
    ['%d-%s' % [s.index, s.name]]: spoke_category(
      s.name,
      s.env,
      local current_spoke_vcn_key = n.key('VCN', [s.name, 'PROJECTS']);
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
