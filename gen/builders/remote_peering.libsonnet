// gen/builders/remote_peering.libsonnet
// Builds config-driven hub remote peering connection overlays.
//
// function(params) -> { route_entries, network_overlay }
//
// params.naming: naming object
// params.connections: normalized hub.network.remote_peering_connections map
// params.local_vcn_entries: routed local VCN entries from platforms.libsonnet
// params.hub_has_spoke_natgw: true for Hub E direct routing, false for firewall hubs

function(params)
  local n = params.naming;
  local connections =
    if std.objectHas(params, 'connections') && params.connections != null then params.connections
    else {};
  local local_vcn_entries =
    if std.objectHas(params, 'local_vcn_entries') then params.local_vcn_entries
    else [];
  local hub_has_spoke_natgw =
    if std.objectHas(params, 'hub_has_spoke_natgw') then params.hub_has_spoke_natgw
    else false;
  local connection_names = std.objectFields(connections);
  local drg_key = n.key('DRG', ['HUB']);
  local hub_vcn_attachment_key = n.key('DRGATT', ['HUB', 'VCN']);

  local has_prefix(value, prefix) =
    std.substr(value, 0, std.length(prefix)) == prefix;
  local name_segment(value) = std.strReplace(value, '_', '-');

  local enrich_connection(name, index) =
    local entry = connections[name];
    local segment = name_segment(name);
    entry {
      index: index,
      name_segment: segment,
      rpc_key: n.key('RPC', ['HUB', segment]),
      rpc_display_name: n.display('rpc', ['hub', segment]),
      drg_att_key: n.key('DRGATT', ['HUB', 'RPC', segment]),
      drg_att_display_name: n.display('drgatt', ['hub', 'rpc', segment]),
      drg_route_table_key: n.key('DRGRT', ['RPC', segment]),
      drg_route_table_display_name: n.display('drgrt', ['rpc', segment]),
      drg_route_distribution_key: n.key('DRGRD', ['RPC', segment]),
      drg_route_distribution_display_name: n.display('drgrd', ['rpc', segment]),
    };

  local entries = [
    enrich_connection(connection_names[i], i)
    for i in std.range(0, std.length(connection_names) - 1)
  ];

  local peer_fields(entry) =
    if entry.peer_id == null then {}
    else if has_prefix(entry.peer_id, 'ocid1.remotepeeringconnection') then {
      peer_id: entry.peer_id,
    } else {
      peer_key: entry.peer_id,
    };

  local route_entries = std.flattenArrays([
    [
      {
        name: '%s-%d' % [entry.name_segment, i + 1],
        display: 'RPC %s' % entry.name,
        vcn: entry.remote_cidrs[i],
        priority: (std.length(local_vcn_entries) + entry.index + 1) * 10,
        kind: 'remote',
        vcn_key: null,
        drg_att_key: entry.drg_att_key,
        route_key: n.route_rule([n.region, 'rpc', entry.name_segment, '%d' % (i + 1)]),
        route_desc: 'Route to RPC %s CIDR %s' % [entry.name, entry.remote_cidrs[i]],
      }
      for i in std.range(0, std.length(entry.remote_cidrs) - 1)
    ]
    for entry in entries
  ]);

  local remote_peering_connections = {
    [entry.rpc_key]: {
      display_name: entry.rpc_display_name,
      peer_region_name: entry.peer_region_name,
    } + peer_fields(entry)
    for entry in entries
  };

  local drg_attachments = {
    [entry.drg_att_key]: {
      display_name: entry.drg_att_display_name,
      drg_route_table_key: entry.drg_route_table_key,
      network_details: {
        attached_resource_key: entry.rpc_key,
        type: 'REMOTE_PEERING_CONNECTION',
      },
    }
    for entry in entries
  };

  local rpc_import_statement(entry, key_suffix, priority) = {
    [n.key_global('ROUTE-TO-RPC', [entry.name_segment] + key_suffix)]: {
      priority: priority,
      action: 'ACCEPT',
      match_criteria: {
        match_type: 'DRG_ATTACHMENT_TYPE',
        attachment_type: 'REMOTE_PEERING_CONNECTION',
        drg_attachment_key: entry.drg_att_key,
      },
    },
  };

  local hub_rpc_distribution_statements = std.foldl(
    function(acc, entry)
      acc + rpc_import_statement(
        entry,
        [],
        (std.length(local_vcn_entries) + entry.index + 1) * 10
      ),
    entries,
    {}
  );

  local spoke_rpc_distribution_statements = std.foldl(
    function(acc, entry)
      acc + rpc_import_statement(
        entry,
        ['S'],
        (std.length(local_vcn_entries) + entry.index + 2) * 10
      ),
    entries,
    {}
  );

  local rpc_route_distribution_statements(entry) =
    {
      [n.key_global('ROUTE-TO-RPC', [entry.name_segment, 'VCN', 'HUB'])]: {
        priority: 10,
        action: 'ACCEPT',
        match_criteria: {
          match_type: 'DRG_ATTACHMENT_ID',
          attachment_type: 'VCN',
          drg_attachment_key: hub_vcn_attachment_key,
        },
      },
    } + {
      [n.key_global('ROUTE-TO-RPC', [entry.name_segment, 'VCN', vcn_entry.name])]: {
        priority: vcn_entry.priority + 10,
        action: 'ACCEPT',
        match_criteria: {
          match_type: 'DRG_ATTACHMENT_ID',
          attachment_type: 'VCN',
          drg_attachment_key: vcn_entry.drg_att_key,
        },
      }
      for vcn_entry in local_vcn_entries
    };

  local rpc_route_distributions =
    if hub_has_spoke_natgw then {
      [entry.drg_route_distribution_key]: {
        display_name: entry.drg_route_distribution_display_name,
        distribution_type: 'IMPORT',
        statements: rpc_route_distribution_statements(entry),
      }
      for entry in entries
    } else {};

  local rpc_route_tables = {
    [entry.drg_route_table_key]:
      if hub_has_spoke_natgw then {
        display_name: entry.drg_route_table_display_name,
        import_drg_route_distribution_key: entry.drg_route_distribution_key,
        is_ecmp_enabled: false,
        route_rules: {},
      } else {
        display_name: entry.drg_route_table_display_name,
        is_ecmp_enabled: false,
        route_rules: {
          ['DRGRT-%s-LZ-RPC-%s-STATIC-ROUTE' % [
            std.asciiUpper(n.region),
            std.asciiUpper(entry.name_segment),
          ]]: {
            destination: '0.0.0.0/0',
            destination_type: 'CIDR_BLOCK',
            next_hop_drg_attachment_key: hub_vcn_attachment_key,
          },
        },
      }
    for entry in entries
  };

  local network_overlay =
    if std.length(entries) == 0 then {}
    else {
      network_configuration+: {
        network_configuration_categories+: {
          '0-shared'+: {
            non_vcn_specific_gateways+: {
              dynamic_routing_gateways+: {
                [drg_key]+: {
                  remote_peering_connections: remote_peering_connections,
                  drg_attachments+: drg_attachments,
                  drg_route_distributions+: {
                    [n.key('DRGRD', ['HUB'])]+: {
                      statements+: hub_rpc_distribution_statements,
                    },
                  } + (if hub_has_spoke_natgw then {
                         [n.key('DRGRD', ['SPOKE'])]+: {
                           statements+: spoke_rpc_distribution_statements,
                         },
                       } else {}) + rpc_route_distributions,
                  drg_route_tables+: rpc_route_tables,
                },
              },
            },
          },
        },
      },
    };

  {
    route_entries: route_entries,
    network_overlay: network_overlay,
  }
