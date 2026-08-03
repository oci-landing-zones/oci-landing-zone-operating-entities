local landing_zone = import '../../landing_zone.libsonnet';
local render_context = import '../../render_context.libsonnet';

{
  non_empty(obj):: std.length(std.objectFields(obj)) > 0,

  connection_names(config)::
    std.objectFields(config.remote_peering_connections),

  connection_segments(config):: [
    std.strReplace(name, '_', '-')
    for name in $.connection_names(config)
  ],

  remote_cidrs(config):: std.flattenArrays([
    config.remote_peering_connections[name].remote_cidrs
    for name in $.connection_names(config)
  ]),

  rpc_route_rules(route_rules, remote_cidrs):: {
    [rule_key]: route_rules[rule_key]
    for rule_key in std.objectFields(route_rules)
    if std.objectHas(route_rules[rule_key], 'destination') &&
       std.member(remote_cidrs, route_rules[rule_key].destination)
  },

  rpc_route_tables(route_tables, remote_cidrs):: {
    [rt_key]:
      local rules = $.rpc_route_rules(route_tables[rt_key].route_rules, remote_cidrs);
      route_tables[rt_key] { route_rules: rules }
    for rt_key in std.objectFields(route_tables)
    if $.non_empty($.rpc_route_rules(route_tables[rt_key].route_rules, remote_cidrs))
  },

  rpc_nsg_ingress_rules(network_security_groups, remote_cidrs):: {
    [nsg_key]:
      local ingress_rules = {
        [rule_key]: network_security_groups[nsg_key].ingress_rules[rule_key]
        for rule_key in std.objectFields(network_security_groups[nsg_key].ingress_rules)
        if std.objectHas(network_security_groups[nsg_key].ingress_rules[rule_key], 'src') &&
           std.member(remote_cidrs, network_security_groups[nsg_key].ingress_rules[rule_key].src)
      };
      {
        ingress_rules: ingress_rules,
      }
    for nsg_key in std.objectFields(network_security_groups)
    if $.non_empty({
      [rule_key]: network_security_groups[nsg_key].ingress_rules[rule_key]
      for rule_key in std.objectFields(network_security_groups[nsg_key].ingress_rules)
      if std.objectHas(network_security_groups[nsg_key].ingress_rules[rule_key], 'src') &&
         std.member(remote_cidrs, network_security_groups[nsg_key].ingress_rules[rule_key].src)
    })
  },

  rpc_vcns(vcns, remote_cidrs):: {
    [vcn_key]:
      local route_tables =
        if std.objectHas(vcns[vcn_key], 'route_tables') then
          $.rpc_route_tables(vcns[vcn_key].route_tables, remote_cidrs)
        else {};
      local network_security_groups =
        if std.objectHas(vcns[vcn_key], 'network_security_groups') then
          $.rpc_nsg_ingress_rules(
            vcns[vcn_key].network_security_groups,
            remote_cidrs
          )
        else {};
      {
        [if $.non_empty(route_tables) then 'route_tables']: route_tables,
        [if $.non_empty(network_security_groups) then 'network_security_groups']:
          network_security_groups,
      }
    for vcn_key in std.objectFields(vcns)
    if $.non_empty(
      if std.objectHas(vcns[vcn_key], 'route_tables') then
        $.rpc_route_tables(vcns[vcn_key].route_tables, remote_cidrs)
      else {}
    ) || $.non_empty(
      if std.objectHas(vcns[vcn_key], 'network_security_groups') then
        $.rpc_nsg_ingress_rules(
          vcns[vcn_key].network_security_groups,
          remote_cidrs
        )
      else {}
    )
  },

  rpc_distribution_statements(statements):: {
    [statement_key]: statements[statement_key]
    for statement_key in std.objectFields(statements)
    if std.objectHas(statements[statement_key], 'match_criteria') &&
       statements[statement_key].match_criteria.attachment_type ==
       'REMOTE_PEERING_CONNECTION'
  },

  rpc_route_distributions(distributions, rpc_distribution_keys):: {
    [distribution_key]:
      if std.member(rpc_distribution_keys, distribution_key) then
        distributions[distribution_key]
      else
        local statements =
          $.rpc_distribution_statements(distributions[distribution_key].statements);
        distributions[distribution_key] { statements: statements }
    for distribution_key in std.objectFields(distributions)
    if std.member(rpc_distribution_keys, distribution_key) ||
       $.non_empty(
         $.rpc_distribution_statements(distributions[distribution_key].statements)
       )
  },

  rpc_drg_attachments(attachments):: {
    [attachment_key]: attachments[attachment_key]
    for attachment_key in std.objectFields(attachments)
    if attachments[attachment_key].network_details.type ==
       'REMOTE_PEERING_CONNECTION'
  },

  rpc_drg_route_tables(route_tables, rpc_route_table_keys):: {
    [rt_key]: route_tables[rt_key]
    for rt_key in std.objectFields(route_tables)
    if std.member(rpc_route_table_keys, rt_key)
  },

  rpc_drgs(drgs, rpc_route_table_keys, rpc_distribution_keys):: {
    [drg_key]:
      local drg = drgs[drg_key];
      local attachments = $.rpc_drg_attachments(drg.drg_attachments);
      local distributions = $.rpc_route_distributions(
        drg.drg_route_distributions,
        rpc_distribution_keys
      );
      local route_tables =
        $.rpc_drg_route_tables(drg.drg_route_tables, rpc_route_table_keys);
      local rpcs =
        if std.objectHas(drg, 'remote_peering_connections') then
          drg.remote_peering_connections
        else {};
      {
        [if $.non_empty(attachments) then 'drg_attachments']: attachments,
        [if $.non_empty(distributions) then 'drg_route_distributions']: distributions,
        [if $.non_empty(route_tables) then 'drg_route_tables']: route_tables,
        [if $.non_empty(rpcs) then 'remote_peering_connections']: rpcs,
      }
    for drg_key in std.objectFields(drgs)
    if $.non_empty($.rpc_drg_attachments(drgs[drg_key].drg_attachments)) ||
       $.non_empty(
         $.rpc_route_distributions(
           drgs[drg_key].drg_route_distributions,
           rpc_distribution_keys
         )
       ) ||
       $.non_empty(
         $.rpc_drg_route_tables(
           drgs[drg_key].drg_route_tables,
           rpc_route_table_keys
         )
       ) ||
       (
         std.objectHas(drgs[drg_key], 'remote_peering_connections') &&
         $.non_empty(drgs[drg_key].remote_peering_connections)
       )
  },

  rpc_policy_keys(ctx):: [
    ctx.n.key('PCY', ['HUB', 'RPC', segment])
    for segment in $.connection_segments(ctx.config)
  ],

  rpc_policies(iam, ctx):: {
    [policy_key]: iam.policies_configuration.supplied_policies[policy_key]
    for policy_key in $.rpc_policy_keys(ctx)
    if std.objectHas(
      iam.policies_configuration.supplied_policies,
      policy_key
    )
  },


  network_fragment(config)::
    local ctx = render_context.from_raw_config(config);
    local result = landing_zone(config).network;
    local categories =
      result.network_configuration.network_configuration_categories;
    local remote_cidrs = $.remote_cidrs(ctx.config);
    local rpc_route_table_keys = [
      ctx.n.key('DRGRT', ['RPC', segment])
      for segment in $.connection_segments(ctx.config)
    ];
    local rpc_distribution_keys = [
      ctx.n.key('DRGRD', ['RPC', segment])
      for segment in $.connection_segments(ctx.config)
    ];
    {
      network_configuration: {
        network_configuration_categories: {
          [category_key]:
            local category = categories[category_key];
            local vcns =
              if std.objectHas(category, 'vcns') then
                $.rpc_vcns(category.vcns, remote_cidrs)
              else {};
            local drgs =
              if std.objectHas(category, 'non_vcn_specific_gateways') &&
                 std.objectHas(
                   category.non_vcn_specific_gateways,
                   'dynamic_routing_gateways'
                 ) then
                $.rpc_drgs(
                  category.non_vcn_specific_gateways.dynamic_routing_gateways,
                  rpc_route_table_keys,
                  rpc_distribution_keys
                )
              else {};
            {
              [if $.non_empty(vcns) then 'vcns']: vcns,
              [if $.non_empty(drgs) then 'non_vcn_specific_gateways']: {
                dynamic_routing_gateways: drgs,
              },
            }
          for category_key in std.objectFields(categories)
          if $.non_empty(
            if std.objectHas(categories[category_key], 'vcns') then
              $.rpc_vcns(categories[category_key].vcns, remote_cidrs)
            else {}
          ) || $.non_empty(
            if std.objectHas(
              categories[category_key],
              'non_vcn_specific_gateways'
            ) && std.objectHas(
              categories[category_key].non_vcn_specific_gateways,
              'dynamic_routing_gateways'
            ) then
              $.rpc_drgs(
                categories[category_key].non_vcn_specific_gateways
                .dynamic_routing_gateways,
                rpc_route_table_keys,
                rpc_distribution_keys
              )
            else {}
          )
        },
      },
    },

  iam_fragment(config)::
    local ctx = render_context.from_raw_config(config);
    local result = landing_zone(config).iam;
    {
      policies_configuration: {
        supplied_policies: $.rpc_policies(result, ctx),
      },
    },
}
