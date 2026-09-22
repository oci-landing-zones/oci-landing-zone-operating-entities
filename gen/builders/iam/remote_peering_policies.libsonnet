// Cross-tenancy Remote Peering Connection policy construction.

function(ctx)
  local config = ctx.config;
  local n = ctx.n;
  local local_requestor_group = ctx.domain_grp(ctx.grp_network);
  local connections =
    if std.objectHas(config, 'remote_peering_connections') then
      config.remote_peering_connections
    else {};
  local name_segment(value) = std.strReplace(value, '_', '-');
  {
    [n.key('PCY', ['HUB', 'RPC', name_segment(connection_name)])]:
      local connection = connections[connection_name];
      local is_requestor = connection.peer_id != null;
      local connection_segment = name_segment(connection_name);
      {
        name: n.display('pcy', ['hub', 'rpc', connection_segment]),
        description: 'Grants cross-tenancy remote peering permissions for %s' %
          n.display('rpc', ['hub', connection_segment]),
        compartment_id: 'TENANCY-ROOT',
        statements:
          if is_requestor then [
            // This is a local identity-domain group. Only the acceptor needs
            // the requestor group OCID because the group is foreign there.
            'Define tenancy Acceptor as %s' % connection.peer_tenancy_ocid,
            'Allow group %s to manage remote-peering-from in compartment cmp-landingzone:cmp-lz-network' %
              local_requestor_group,
            'Endorse group %s to manage remote-peering-to in tenancy Acceptor' %
              local_requestor_group,
          ] else [
            'Define group requestorGroup as %s' % connection.requestor_group_ocid,
            'Define tenancy Requestor as %s' % connection.peer_tenancy_ocid,
            'Admit group requestorGroup of tenancy Requestor to manage remote-peering-to in compartment cmp-landingzone:cmp-lz-network',
          ],
      }
    for connection_name in std.objectFields(connections)
    if connections[connection_name].peer_tenancy_ocid != null
  }
