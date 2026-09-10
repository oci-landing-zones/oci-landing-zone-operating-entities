// Select local RPC routing behavior from the normalized regional hub profile.
//
// function(side) -> { mode, firewall_egress_route_table }
function(side)
  local kind = side.ctx.config.hub.kind;
  local n = side.ctx.n;
  assert std.member(['hub_a', 'hub_b', 'hub_c', 'hub_e'], kind) :
    'Unsupported RPC hub kind %s' % kind;
  {
    mode: if kind == 'hub_e' then 'direct' else 'firewall',
    firewall_egress_route_table:
      if kind == 'hub_a' then n.key('RT', ['HUB', 'FW', 'INT'])
      else if kind == 'hub_b' then n.key('RT', ['HUB', 'FW'])
      else if kind == 'hub_c' then n.key('RT', ['HUB', 'TRUST'])
      else null,
  }
