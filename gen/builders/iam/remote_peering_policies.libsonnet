// Cross-tenancy Remote Peering Connection policy construction.

function(ctx)
  local config = ctx.config;
  local n = ctx.n;
  local connections =
    if std.objectHas(config, 'remote_peering_connections') then
      config.remote_peering_connections
    else {};
  local name_segment(value) = std.strReplace(value, '_', '-');
  {
    [n.key('PCY', ['HUB', 'RPC', name_segment(connection_name)])]:
      local connection = connections[connection_name];
      local is_requestor = connection.peer_id != null;
      local peer_tenancy_alias = if is_requestor then 'Acceptor' else 'Requestor';
      local connection_segment = name_segment(connection_name);
      {
        name: n.display('pcy', ['hub', 'rpc', connection_segment]),
        description: 'Grants cross-tenancy remote peering permissions for %s' %
          n.display('rpc', ['hub', connection_segment]),
        compartment_id: 'TENANCY-ROOT',
        statements: [
          'Define group requestorGroup as %s' % connection.requestor_group_ocid,
          'Define tenancy %s as %s' % [peer_tenancy_alias, connection.peer_tenancy_ocid],
        ] + if is_requestor then [
          'Allow group requestorGroup to manage remote-peering-from in compartment cmp-landingzone:cmp-lz-network',
          'Endorse group requestorGroup to manage remote-peering-to in tenancy Acceptor',
        ] else [
          'Admit group requestorGroup of tenancy Requestor to manage remote-peering-to in compartment cmp-landingzone:cmp-lz-network',
        ],
      }
    for connection_name in std.objectFields(connections)
    if connections[connection_name].peer_tenancy_ocid != null
  }
