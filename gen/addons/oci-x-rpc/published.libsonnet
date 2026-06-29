local landing_zone = import '../../landing_zone.libsonnet';

{
  local contains(value, needle) =
    std.length(std.findSubstr(needle, std.asciiLower(value))) > 0,

  local non_empty(obj) = std.length(std.objectFields(obj)) > 0,

  local rpc_route_rules(route_rules) = {
    [rule_key]: route_rules[rule_key]
    for rule_key in std.objectFields(route_rules)
    if contains(rule_key, 'rpc') ||
       (std.objectHas(route_rules[rule_key], 'description') &&
        contains(route_rules[rule_key].description, 'rpc'))
  },

  local rpc_route_tables(route_tables) = {
    [rt_key]:
      local rules = rpc_route_rules(route_tables[rt_key].route_rules);
      route_tables[rt_key] { route_rules: rules }
    for rt_key in std.objectFields(route_tables)
    if non_empty(rpc_route_rules(route_tables[rt_key].route_rules))
  },

  local rpc_vcns(vcns) = {
    [vcn_key]:
      local route_tables = rpc_route_tables(vcns[vcn_key].route_tables);
      { route_tables: route_tables }
    for vcn_key in std.objectFields(vcns)
    if std.objectHas(vcns[vcn_key], 'route_tables') &&
       non_empty(rpc_route_tables(vcns[vcn_key].route_tables))
  },

  local rpc_distribution_statements(statements) = {
    [statement_key]: statements[statement_key]
    for statement_key in std.objectFields(statements)
    if contains(statement_key, 'rpc') ||
       (std.objectHas(statements[statement_key], 'match_criteria') &&
        statements[statement_key].match_criteria.attachment_type == 'REMOTE_PEERING_CONNECTION')
  },

  local rpc_route_distributions(distributions) = {
    [distribution_key]:
      local statements = rpc_distribution_statements(distributions[distribution_key].statements);
      distributions[distribution_key] { statements: statements }
    for distribution_key in std.objectFields(distributions)
    if non_empty(rpc_distribution_statements(distributions[distribution_key].statements))
  },

  local rpc_drg_attachments(attachments) = {
    [attachment_key]: attachments[attachment_key]
    for attachment_key in std.objectFields(attachments)
    if attachments[attachment_key].network_details.type == 'REMOTE_PEERING_CONNECTION'
  },

  local rpc_drg_route_tables(route_tables) = {
    [rt_key]: route_tables[rt_key]
    for rt_key in std.objectFields(route_tables)
    if contains(rt_key, 'rpc')
  },

  local rpc_drgs(drgs) = {
    [drg_key]:
      local drg = drgs[drg_key];
      local attachments = rpc_drg_attachments(drg.drg_attachments);
      local distributions = rpc_route_distributions(drg.drg_route_distributions);
      local route_tables = rpc_drg_route_tables(drg.drg_route_tables);
      local rpcs = if std.objectHas(drg, 'remote_peering_connections') then
        drg.remote_peering_connections
      else {};
      {
        [if non_empty(attachments) then 'drg_attachments']: attachments,
        [if non_empty(distributions) then 'drg_route_distributions']: distributions,
        [if non_empty(route_tables) then 'drg_route_tables']: route_tables,
        [if non_empty(rpcs) then 'remote_peering_connections']: rpcs,
      }
    for drg_key in std.objectFields(drgs)
    if non_empty(rpc_drg_attachments(drgs[drg_key].drg_attachments)) ||
       non_empty(rpc_route_distributions(drgs[drg_key].drg_route_distributions)) ||
       non_empty(rpc_drg_route_tables(drgs[drg_key].drg_route_tables)) ||
       (std.objectHas(drgs[drg_key], 'remote_peering_connections') &&
        non_empty(drgs[drg_key].remote_peering_connections))
  },

  local rpc_firewall_address_lists(policies, remote_cidrs) = {
    [policy_key]: {
      address_lists: {
        [list_key]: policies[policy_key].address_lists[list_key]
        for list_key in std.objectFields(policies[policy_key].address_lists)
        if contains(list_key, 'spokes') ||
           std.length([
             cidr
             for cidr in remote_cidrs
             if std.member(policies[policy_key].address_lists[list_key].addresses, cidr)
           ]) > 0
      },
    }
    for policy_key in std.objectFields(policies)
    if non_empty({
      [list_key]: policies[policy_key].address_lists[list_key]
      for list_key in std.objectFields(policies[policy_key].address_lists)
      if contains(list_key, 'spokes') ||
         std.length([
           cidr
           for cidr in remote_cidrs
           if std.member(policies[policy_key].address_lists[list_key].addresses, cidr)
         ]) > 0
    })
  },

  network_fragment(config)::
    local result = landing_zone(config).network;
    local categories = result.network_configuration.network_configuration_categories;
    local remote_cidrs = std.flattenArrays([
      config.remote_peering_connections[name].remote_cidrs
      for name in std.objectFields(config.remote_peering_connections)
    ]);
    {
      network_configuration: {
        network_configuration_categories: {
          [category_key]:
            local category = categories[category_key];
            local vcns = if std.objectHas(category, 'vcns') then rpc_vcns(category.vcns) else {};
            local drgs =
              if std.objectHas(category, 'non_vcn_specific_gateways') &&
                 std.objectHas(category.non_vcn_specific_gateways, 'dynamic_routing_gateways') then
                rpc_drgs(category.non_vcn_specific_gateways.dynamic_routing_gateways)
              else {};
            local firewall_policies =
              if std.objectHas(category, 'non_vcn_specific_gateways') &&
                 std.objectHas(category.non_vcn_specific_gateways, 'network_firewalls_configuration') then
                rpc_firewall_address_lists(
                  category.non_vcn_specific_gateways.network_firewalls_configuration.network_firewall_policies,
                  remote_cidrs
                )
              else {};
            {
              [if non_empty(vcns) then 'vcns']: vcns,
              [if non_empty(drgs) then 'non_vcn_specific_gateways']: {
                dynamic_routing_gateways: drgs,
              },
              [if non_empty(firewall_policies) then 'network_firewalls_configuration']: {
                network_firewall_policies: firewall_policies,
              },
            }
          for category_key in std.objectFields(categories)
          if non_empty(if std.objectHas(categories[category_key], 'vcns') then
               rpc_vcns(categories[category_key].vcns)
             else {}) ||
             non_empty(
               if std.objectHas(categories[category_key], 'non_vcn_specific_gateways') &&
                  std.objectHas(categories[category_key].non_vcn_specific_gateways, 'dynamic_routing_gateways') then
                 rpc_drgs(categories[category_key].non_vcn_specific_gateways.dynamic_routing_gateways)
               else {}
             ) ||
             non_empty(
               if std.objectHas(categories[category_key], 'non_vcn_specific_gateways') &&
                  std.objectHas(categories[category_key].non_vcn_specific_gateways, 'network_firewalls_configuration') then
                 rpc_firewall_address_lists(
                   categories[category_key].non_vcn_specific_gateways.network_firewalls_configuration.network_firewall_policies,
                   remote_cidrs
                 )
               else {}
             )
        },
      },
    },

  iam_fragment(config)::
    local result = landing_zone(config).iam;
    {
      policies_configuration: {
        supplied_policies: {
          [policy_key]: result.policies_configuration.supplied_policies[policy_key]
          for policy_key in std.objectFields(result.policies_configuration.supplied_policies)
          if contains(policy_key, 'rpc')
        },
      },
    },
}
