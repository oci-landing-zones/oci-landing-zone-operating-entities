local common = import 'hub/hub_common.libsonnet';

{
  has_network(pe):: std.objectHas(pe.platform_config, 'network') && pe.platform_config.network != null,

  collect_entries(config, topo)::
    local ordered_env_names = topo.ordered_env_names();
    local environment_projects = {
      [env_name]: topo.project_names(env_name)
      for env_name in ordered_env_names
    };
    local environment_labels = {
      [env_name]: {
        scope_title: topo.env_display(env_name),
        scope_long_title: topo.env_display_long(env_name),
      }
      for env_name in ordered_env_names
    };
    local env_platform_entries = std.flatMap(
      function(env_name)
        local env = config.environments[env_name];
        if std.objectHas(env, 'platforms') then
          [
            {
              scope: topo.env_platform(env_name, p_name),
              scope_config: {
                projects: environment_projects[env_name],
                environment_projects: environment_projects,
                environment_labels: environment_labels,
              },
              platform_config: env.platforms[p_name],
            }
            for p_name in std.objectFields(env.platforms)
          ]
        else [],
      ordered_env_names
    );
    local shared_platform_entries =
      if std.objectHas(config, 'shared_platforms') then
        [
          {
            scope: topo.shared_platform(p_name),
            scope_config: {
              projects: [],
              environment_projects: environment_projects,
              environment_labels: environment_labels,
            },
            platform_config: config.shared_platforms[p_name],
          }
          for p_name in std.objectFields(config.shared_platforms)
        ]
      else [];
    local all_platform_entries = env_platform_entries + shared_platform_entries;
    {
      all_platform_entries: all_platform_entries,
      extension_entries: [
        pe
        for pe in all_platform_entries
        if std.objectHas(pe.platform_config, 'extension')
      ],
      network_only_platforms: [
        pe
        for pe in all_platform_entries
        if !std.objectHas(pe.platform_config, 'extension') && $.has_network(pe)
      ],
    },

  vcn_label(pe):: {
    raw_name: '%s-platform-%s' % [pe.scope.scope_name, pe.scope.platform_name],
    display: '%s %s' % [pe.scope.scope_title, std.asciiUpper(pe.scope.platform_name)],
  },

  publication_category_key(scope):: '%s-platform-%s' % [
    std.asciiLower(scope.scope_name),
    std.asciiLower(scope.platform_name),
  ],

  strip_publication_local_routes(vcn, n, route_keys_to_drop=[])::
    local route_drop_keys = [n.route_rule([n.region, 'default'])] + route_keys_to_drop;
    vcn {
      route_tables: {
        [rt_key]: vcn.route_tables[rt_key] {
          route_rules: {
            [route_key]: vcn.route_tables[rt_key].route_rules[route_key]
            for route_key in std.objectFields(vcn.route_tables[rt_key].route_rules)
            if !std.member(route_drop_keys, route_key)
          },
        }
        for rt_key in std.objectFields(vcn.route_tables)
      },
      vcn_specific_gateways:
        if std.objectHas(vcn.vcn_specific_gateways, 'nat_gateways') then
          {
            [gateway_type]: vcn.vcn_specific_gateways[gateway_type]
            for gateway_type in std.objectFields(vcn.vcn_specific_gateways)
            if gateway_type != 'nat_gateways'
          }
        else vcn.vcn_specific_gateways,
    },

  publication_network_category(category, n, route_keys_to_drop=[])::
    category {
      vcns: {
        [key]: $.strip_publication_local_routes(category.vcns[key], n, route_keys_to_drop)
        for key in std.objectFields(category.vcns)
      },
    },

  build_routed_vcn_entries(config, all_platform_entries, topo, n)::
    local spoke_env_names = topo.ordered_spoke_env_names();
    local spoke_envs = [
      { name: name, env: config.environments[name] }
      for name in spoke_env_names
    ];
    local spoke_vcn_entries = std.mapWithIndex(
      function(i, s)
        local route_desc = 'Route to VCN %s Projects' % topo.env_display(s.name);
        {
          name: s.name,
          display: topo.env_display(s.name),
          vcn: s.env.shared_project_network.network.vcn,
          priority: (i + 1) * 10,
          kind: 'spoke',
          drg_att_key: n.key('DRGATT', [s.name, 'PROJ']),
          vcn_key: n.key('VCN', [s.name, 'PROJECTS']),
          drg_att_display: n.display('drgatt', [s.name, 'proj']),
          route_key: n.route_rule([n.region, s.name, 'projects']),
          route_desc: route_desc,
        },
      spoke_envs
    );
    local network_platform_entries = [
      pe
      for pe in all_platform_entries
      if $.has_network(pe)
    ];
    local platform_vcn_entries = std.mapWithIndex(
      function(i, pe)
        local label = $.vcn_label(pe);
        local route_desc = 'Route to VCN %s' % label.display;
        {
          name: label.raw_name,
          display: label.display,
          vcn: pe.platform_config.network.vcn,
          priority: (std.length(spoke_envs) + i + 1) * 10,
          kind: 'platform',
          drg_att_key: n.key('DRGATT', [pe.scope.scope_name, 'PLATFORM', pe.scope.platform_name]),
          vcn_key: n.key('VCN', [pe.scope.scope_name, 'PLATFORM', pe.scope.platform_name]),
          drg_att_display: n.display('drgatt', [pe.scope.scope_name, 'platform', pe.scope.platform_name]),
          route_key: n.route_rule([n.region, 'vcn', label.raw_name]),
          route_desc: route_desc,
        },
      network_platform_entries
    );
    {
      all_vcn_entries: spoke_vcn_entries + platform_vcn_entries,
    },

  build_extension_route_targets(inputs)::
    local pe = inputs.platform_entry;
    local routed_vcn_entries = inputs.routed_vcn_entries;
    local n = inputs.naming;
    local hub_vcn_cidr = inputs.hub_vcn_cidr;
    local hub_has_spoke_natgw =
      if std.objectHas(inputs, 'hub_has_spoke_natgw') then inputs.hub_has_spoke_natgw
      else true;
    if hub_vcn_cidr == null then null
    else
      local target_vcn_key = n.key('VCN', [pe.scope.scope_name, 'PLATFORM', pe.scope.platform_name]);
      {
        hub: {
          route_key: n.route_rule([n.region, 'hub']),
          description: 'Route to the Hub VCN through DRG',
          destination: hub_vcn_cidr,
        },
        peers: {
          [e.route_key]: {
            description: '%s through DRG' % e.route_desc,
            destination: e.vcn,
          }
          for e in routed_vcn_entries
          if e.vcn_key != target_vcn_key
        },
        internet_default_target: if hub_has_spoke_natgw then 'local_natgw' else 'drg',
      },

  build_network_category(inputs)::
    local pe = inputs.platform_entry;
    local n = inputs.naming;
    local hub_vcn_cidr = inputs.hub_vcn_cidr;
    local routed_vcn_entries =
      if std.objectHas(inputs, 'routed_vcn_entries') then inputs.routed_vcn_entries
      else [];
    local hub_has_spoke_natgw =
      if std.objectHas(inputs, 'hub_has_spoke_natgw') then inputs.hub_has_spoke_natgw
      else false;
    local scope = pe.scope;
    local env_name = scope.scope_name;
    local plat = scope.platform_name;
    local dns = scope.dns;
    local vcn_cidr = pe.platform_config.network.vcn;
    local plat_subnets = pe.platform_config.network.subnets;
    local rt_key = n.key('RT', [env_name, 'PLATFORM', plat, 'GENERIC']);
    local sl_key = n.key('SL', [env_name, 'PLATFORM', plat, 'GENERIC']);
    local vcn_key = n.key('VCN', [env_name, 'PLATFORM', plat]);
    local peer_routes = {
      [e.route_key]: {
        description: '%s through DRG' % e.route_desc,
        destination: e.vcn,
        destination_type: 'CIDR_BLOCK',
        network_entity_key: n.key('DRG', ['HUB']),
      }
      for e in routed_vcn_entries
      if e.vcn_key != vcn_key
    };
    local route_rules = {
      [n.route_rule([n.region, 'sgw'])]: {
        description: 'Route to Oracle Services Network through Service GW',
        destination: 'all-services',
        destination_type: 'SERVICE_CIDR_BLOCK',
        network_entity_key: n.key('SGW', [env_name, 'PLATFORM', plat]),
      },
    } + if hub_has_spoke_natgw then
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
          network_entity_key: n.key('NGW', [env_name, 'PLATFORM', plat]),
        },
      } + peer_routes
    else {
      [n.route_rule([n.region, 'drg'])]: {
        description: 'Route to 0.0.0.0/0 through DRG',
        destination: '0.0.0.0/0',
        destination_type: 'CIDR_BLOCK',
        network_entity_key: n.key('DRG', ['HUB']),
      },
    };
    {
      category_compartment_id: scope.network_compartment_key,
      vcns: {
        [vcn_key]: {
          display_name: n.display('vcn', [env_name, 'platform', plat]),
          cidr_blocks: [vcn_cidr],
          dns_label: n.dns_label(['vcn', n.region, 'lz', dns, plat]),
          block_nat_traffic: false,
          is_attach_drg: false,
          is_create_igw: false,
          is_ipv6enabled: false,
          is_oracle_gua_allocation_enabled: false,
          default_security_list: { egress_rules: [], ingress_rules: [] },
          route_tables: {
            [rt_key]: {
              display_name: n.display('rt', [env_name, 'platform', plat, 'generic']),
              route_rules: route_rules,
            },
          },
          security_lists: {
            [sl_key]: {
              display_name: n.display('sl', [env_name, 'platform', plat, 'generic']),
              egress_rules: [
                {
                  description: 'Allow all outbound traffic',
                  dst: '0.0.0.0/0',
                  dst_type: 'CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
              ],
              ingress_rules: common._icmp_ingress_rules(vcn_cidr, management_cidr=hub_vcn_cidr),
            },
          },
          subnets: {
            [n.key('SN', [env_name, 'PLATFORM', plat, sn_name])]: {
              display_name: n.display('sn', [env_name, 'platform', plat, sn_name]),
              cidr_block: plat_subnets[sn_name],
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            }
            for sn_name in std.objectFields(plat_subnets)
          },
          vcn_specific_gateways: {
            [if hub_has_spoke_natgw then 'nat_gateways']: {
              [n.key('NGW', [env_name, 'PLATFORM', plat])]: {
                display_name: n.display('ngw', [env_name, 'platform', plat]),
                block_traffic: false,
              },
            },
            service_gateways: {
              [n.key('SGW', [env_name, 'PLATFORM', plat])]: {
                display_name: n.display('sgw', [env_name, 'platform', plat]),
                services: 'all-services',
              },
            },
          },
        },
      },
    },
}
