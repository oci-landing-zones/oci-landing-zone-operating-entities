// Build a region-neutral RPC network replacement for one side of a DR pair.
local collections = import '../../../lib/collections.libsonnet';
local hub_adapter = import 'rpc_hub_adapter.libsonnet';

local remote_routes(n, drg_key, peer_role, peer_region, peer_cidrs) = {
  [n.route_rule([n.region, 'rpc', peer_role, std.toString(i + 1)])]: {
    description: 'Route to %s CIDR %s through DRG' % [peer_region, peer_cidrs[i]],
    destination: peer_cidrs[i],
    destination_type: 'CIDR_BLOCK',
    network_entity_key: drg_key,
  }
  for i in std.range(0, std.length(peer_cidrs) - 1)
};

local rpc_route_statement(attachment_key, priority) = {
  action: 'ACCEPT',
  priority: priority,
  match_criteria: {
    match_type: 'DRG_ATTACHMENT_ID',
    attachment_type: 'REMOTE_PEERING_CONNECTION',
    drg_attachment_key: attachment_key,
  },
};

local vcn_import_statement(attachment_key, priority) = {
  action: 'ACCEPT',
  priority: priority,
  match_criteria: {
    match_type: 'DRG_ATTACHMENT_ID',
    attachment_type: 'VCN',
    drg_attachment_key: attachment_key,
  },
};

local categories(network) =
  network.network_configuration.network_configuration_categories;

local vcn_entries(network) = std.flattenArrays([
  local category = categories(network)[category_key];
  [
    {
      category_key: category_key,
      vcn_key: vcn_key,
      vcn: category.vcns[vcn_key],
    }
    for vcn_key in std.objectFields(category.vcns)
  ]
  for category_key in std.objectFields(categories(network))
]);

{
  build(
    local_side,
    peer_side,
    final_network,
    local_role,
    peer_role,
    is_requester
  )::
    local n = local_side.ctx.n;
    local adapter = hub_adapter(local_side);
    local drg_key = n.key('DRG', ['HUB']);
    local hub_distribution_key = n.key('DRGRD', ['HUB']);
    local spoke_distribution_key = n.key('DRGRD', ['SPOKE']);
    local local_rpc_key = n.key('RPC', ['HUB', local_role]);
    local peer_rpc_key = peer_side.ctx.n.key('RPC', ['HUB', peer_role]);
    local rpc_attachment_key = n.key('DRGATT', ['HUB', 'RPC', local_role]);
    local rpc_distribution_key = n.key('DRGRD', ['RPC', local_role]);
    local rpc_route_table_key = n.key('DRGRT', ['RPC', local_role]);
    local shared_category = categories(final_network)['0-shared'];
    local local_drg = shared_category.non_vcn_specific_gateways
      .dynamic_routing_gateways[drg_key];
    local local_vcns = vcn_entries(final_network);
    local advertised_vcns = [
      local matches = [
        entry
        for entry in local_vcns
        if std.member(entry.vcn.cidr_blocks, advertised_cidr)
      ];
      assert std.length(matches) == 1 :
        'RPC advertised CIDR %s must resolve to exactly one rendered local VCN' %
        advertised_cidr;
      matches[0] + { advertised_cidr: advertised_cidr }
      for advertised_cidr in local_side.advertised_cidrs
    ];
    local vcn_attachments = {
      [local_drg.drg_attachments[attachment_key]
       .network_details.attached_resource_key]: attachment_key
      for attachment_key in std.objectFields(local_drg.drg_attachments)
      if local_drg.drg_attachments[attachment_key].network_details.type == 'VCN'
    };
    local advertised_attachments = [
      assert std.objectHas(vcn_attachments, entry.vcn_key) :
        'RPC advertised VCN %s must have a local DRG attachment' % entry.vcn_key;
      {
        cidr: entry.advertised_cidr,
        vcn_key: entry.vcn_key,
        attachment_key: vcn_attachments[entry.vcn_key],
      }
      for entry in advertised_vcns
    ];
    local rpc_attachment = {
      display_name: n.display('DRGATT', ['HUB', 'RPC', local_role]),
      drg_route_table_key: rpc_route_table_key,
      network_details: {
        type: 'REMOTE_PEERING_CONNECTION',
        attached_resource_key: local_rpc_key,
      },
    };
    local rpc = {
      display_name: n.display('RPC', ['HUB', local_role]),
      peer_region_name: peer_side.ctx.config.region,
    } + (if is_requester then { peer_key: peer_rpc_key } else {});
    local rpc_distribution = {
      display_name: n.display('DRGRD', ['RPC', local_role]),
      distribution_type: 'IMPORT',
      statements: {},
    };
    local common_drg = {
      drg_attachments+: {
        [rpc_attachment_key]: rpc_attachment,
      },
      drg_route_distributions+: {
        [rpc_distribution_key]: rpc_distribution,
      },
      remote_peering_connections+: {
        [local_rpc_key]: rpc,
      },
    };
    local hub_rpc_priority = if is_requester then 20 else 30;
    local spoke_rpc_priority = hub_rpc_priority + 10;
    local rpc_import_statements = {
      [n.key_global(
        'ROUTE-TO-RPC',
        [local_role, 'VCN', std.toString(i + 1)]
      )]: vcn_import_statement(advertised_attachments[i].attachment_key, (i + 1) * 10)
      for i in std.range(0, std.length(advertised_attachments) - 1)
    };
    local rpc_static_routes = {
      [std.join('-', [
        'DRGRT',
        std.asciiUpper(n.region),
        'LZ',
        'RPC',
        std.asciiUpper(local_role),
        'VCN',
        std.toString(i + 1),
        'STATIC',
        'ROUTE',
      ])]: {
        destination: advertised_attachments[i].cidr,
        destination_type: 'CIDR_BLOCK',
        next_hop_drg_attachment_key: advertised_attachments[i].attachment_key,
      }
      for i in std.range(0, std.length(advertised_attachments) - 1)
    };
    local direct_drg = common_drg + {
      drg_route_distributions+: {
        [hub_distribution_key]+: {
          statements+: {
            [n.key_global('ROUTE-TO-RPC', [local_role])]:
              rpc_route_statement(rpc_attachment_key, hub_rpc_priority),
          },
        },
        [spoke_distribution_key]+: {
          statements+: {
            [n.key_global('ROUTE-TO-RPC', [local_role, 'S'])]:
              rpc_route_statement(rpc_attachment_key, spoke_rpc_priority),
          },
        },
        [rpc_distribution_key]+: {
          statements+: rpc_import_statements,
        },
      },
      drg_route_tables+: {
        [rpc_route_table_key]: {
          display_name: n.display('DRGRT', ['RPC', local_role]),
          import_drg_route_distribution_key: rpc_distribution_key,
          is_ecmp_enabled: false,
          route_rules: {},
        },
      },
    };
    local firewall_drg = common_drg + {
      drg_route_distributions+: {
        [hub_distribution_key]+: {
          statements+: {
            [n.key_global('ROUTE-TO-RPC', [local_role])]:
              rpc_route_statement(rpc_attachment_key, hub_rpc_priority),
          },
        },
      },
      drg_route_tables+: {
        [rpc_route_table_key]: {
          display_name: n.display('DRGRT', ['RPC', local_role]),
          import_drg_route_distribution_key: rpc_distribution_key,
          is_ecmp_enabled: false,
          route_rules: rpc_static_routes,
        },
      },
    };
    local is_advertised_vcn(entry) = std.length([
      cidr
      for cidr in entry.vcn.cidr_blocks
      if std.member(local_side.advertised_cidrs, cidr)
    ]) > 0;
    local target_route_tables(entry) =
      if adapter.mode == 'firewall' then
        if std.objectHas(entry.vcn.route_tables, adapter.firewall_egress_route_table)
        then [adapter.firewall_egress_route_table]
        else []
      else if is_advertised_vcn(entry) then collections.unique([
        subnet.route_table_key
        for subnet in std.objectValues(entry.vcn.subnets)
      ])
      else [];
    local remote_route_categories = {
      [category_key]+: {
        vcns+: {
          [entry.vcn_key]+: {
            route_tables+: {
              [route_table_key]+: {
                route_rules+: remote_routes(
                  n,
                  drg_key,
                  local_role,
                  peer_side.ctx.config.region,
                  peer_side.advertised_cidrs
                ),
              }
              for route_table_key in target_route_tables(entry)
            },
          }
          for entry in local_vcns
          if entry.category_key == category_key &&
             std.length(target_route_tables(entry)) > 0
        },
      }
      for category_key in std.objectFields(categories(final_network))
      if std.length([
        entry
        for entry in local_vcns
        if entry.category_key == category_key &&
           std.length(target_route_tables(entry)) > 0
      ]) > 0
    };
    local with_remote_routes = final_network + {
      network_configuration+: {
        network_configuration_categories+: remote_route_categories,
      },
    };
    with_remote_routes + {
      network_configuration+: {
        network_configuration_categories+: {
          '0-shared'+: {
            non_vcn_specific_gateways+: {
              dynamic_routing_gateways+: {
                [drg_key]+:
                  if adapter.mode == 'direct' then direct_drg else firewall_drg,
              },
            },
          },
        },
      },
    },
}
