// A mixed Hub B/Hub E pair builds reciprocal, exact, attachment-scoped RPC routes.
// contains: "requester_peer_region": "eu-frankfurt-1"
// contains: "requester_peer_key": "RPC-FRA-LZ-HUB-DR-KEY"
// contains: "acceptor_peer_region": "uk-london-1"
// contains: "requester_rpc_key": "RPC-LHR-LZ-HUB-HOME-KEY"
// contains: "acceptor_rpc_key": "RPC-FRA-LZ-HUB-DR-KEY"
// contains: "requester_remote_destinations": [
// contains: "acceptor_remote_destinations": [
// contains: "all_rpc_matches_use_attachment_id": true
local collections = import 'gen/lib/collections.libsonnet';
local validate = import 'gen/dr_pair.libsonnet';
local lz = import 'gen/landing_zone.libsonnet';
local requester_builder = import 'gen/addons/oci-lz-dr/one-oe/rpc_requester.libsonnet';
local acceptor_builder = import 'gen/addons/oci-lz-dr/one-oe/rpc_acceptor.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

local pair = validate(home, dr);
local requester = requester_builder(
  pair.dr,
  pair.home,
  lz(pair.dr.ctx.config).network
);
local acceptor = acceptor_builder(
  pair.home,
  pair.dr,
  lz(pair.home.ctx.config).network
);

local categories(network) =
  network.network_configuration.network_configuration_categories;
local drg(network, side) =
  categories(network)['0-shared'].non_vcn_specific_gateways
  .dynamic_routing_gateways[side.ctx.n.key('DRG', ['HUB'])];
local rpc_key(side, role) = side.ctx.n.key('RPC', ['HUB', role]);
local rpc(network, side, role) =
  drg(network, side).remote_peering_connections[rpc_key(side, role)];

local remote_destinations(network, side, role) = collections.unique(std.flattenArrays([
  std.flattenArrays([
    [
      route_table.route_rules[rule_key].destination
      for rule_key in std.objectFields(route_table.route_rules)
      if std.startsWith(
        rule_key,
        side.ctx.n.route_rule([side.ctx.n.region, 'rpc', role])
      )
    ]
    for route_table in std.objectValues(vcn.route_tables)
  ])
  for category in std.objectValues(categories(network))
  for vcn in std.objectValues(category.vcns)
]));

local rpc_matches(network, side) = [
  statement.match_criteria
  for distribution in std.objectValues(drg(network, side).drg_route_distributions)
  for statement in std.objectValues(distribution.statements)
  if statement.match_criteria.attachment_type == 'REMOTE_PEERING_CONNECTION'
];
local all_matches = rpc_matches(requester, pair.dr) + rpc_matches(acceptor, pair.home);

{
  requester_peer_region: rpc(requester, pair.dr, 'HOME').peer_region_name,
  requester_peer_key: rpc(requester, pair.dr, 'HOME').peer_key,
  acceptor_peer_region: rpc(acceptor, pair.home, 'DR').peer_region_name,
  requester_rpc_key: rpc_key(pair.dr, 'HOME'),
  acceptor_rpc_key: rpc_key(pair.home, 'DR'),
  requester_remote_destinations:
    remote_destinations(requester, pair.dr, 'home'),
  acceptor_remote_destinations:
    remote_destinations(acceptor, pair.home, 'dr'),
  all_rpc_matches_use_attachment_id:
    std.length(all_matches) > 0 &&
    collections.all([
      match.match_type == 'DRG_ATTACHMENT_ID' &&
      std.objectHas(match, 'drg_attachment_key')
      for match in all_matches
    ]),
}
