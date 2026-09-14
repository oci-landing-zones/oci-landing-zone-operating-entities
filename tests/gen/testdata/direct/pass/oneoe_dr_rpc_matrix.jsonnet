// Published same-hub DR pairs and the custom Factory Hub E pair remain interoperable.
// contains: "all_3_published_same_hub_pairs_pass": true
// contains: "factory_hub_e_pair_pass": true
// contains: "hub_c_backends_pass": true
// contains: "published_entrypoints_render": true
local collections = import 'gen/lib/collections.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local validate = import 'gen/dr_pair.libsonnet';
local lz = import 'gen/landing_zone.libsonnet';
local profiles = import 'gen/addons/oci-lz-dr/one-oe/profiles.libsonnet';
local requester_builder = import 'gen/addons/oci-lz-dr/one-oe/rpc_requester.libsonnet';
local acceptor_builder = import 'gen/addons/oci-lz-dr/one-oe/rpc_acceptor.libsonnet';

local published_kinds = ['hub_a', 'hub_b', 'hub_c'];
local factory_dr_base = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';
local factory_home(kind) = defaults[kind] + {
  disaster_recovery: {
    rpc: {
      advertised_cidrs: [
        '10.0.0.0/21',
        '10.0.64.0/21',
        '10.0.128.0/21',
      ],
    },
  },
};
local factory_dr(kind) = factory_dr_base + { hub+: { kind: kind } };
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
local matches_are_attachment_scoped(matches) =
  std.length(matches) > 0 && collections.all([
    match.match_type == 'DRG_ATTACHMENT_ID' &&
    std.objectHas(match, 'drg_attachment_key')
    for match in matches
  ]);

local combination(name, home_config, dr_config) =
  local pair = validate(
    home_config,
    dr_config
  );
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
  local requester_rpc = rpc(requester, pair.dr, 'HOME');
  local acceptor_rpc = rpc(acceptor, pair.home, 'DR');
  {
    name: name,
    passes:
      requester_rpc.peer_region_name == pair.home.ctx.config.region &&
      requester_rpc.peer_key == rpc_key(pair.home, 'DR') &&
      acceptor_rpc.peer_region_name == pair.dr.ctx.config.region &&
      !std.objectHas(acceptor_rpc, 'peer_key') &&
      remote_destinations(requester, pair.dr, 'home') ==
        pair.home.advertised_cidrs &&
      remote_destinations(acceptor, pair.home, 'dr') ==
        pair.dr.advertised_cidrs &&
      matches_are_attachment_scoped(rpc_matches(requester, pair.dr)) &&
      matches_are_attachment_scoped(rpc_matches(acceptor, pair.home)),
  };

local published_combinations = [
  combination(
    '%s_%s' % [kind, kind],
    profiles.rpc_pairs[kind].home,
    profiles.rpc_pairs[kind].dr
  )
  for kind in published_kinds
];
local factory_hub_e_pair = combination(
  'hub_e_hub_e',
  factory_home('hub_e'),
  factory_dr('hub_e')
);
local combinations = published_combinations + [factory_hub_e_pair];
local hub_c_pair = validate(
  profiles.rpc_pairs.hub_c.home,
  profiles.rpc_pairs.hub_c.dr
);
local home_backends = acceptor_builder(
  hub_c_pair.home,
  hub_c_pair.dr,
  lz(hub_c_pair.home.ctx.config).network_backends
);
local dr_backends = requester_builder(
  hub_c_pair.dr,
  hub_c_pair.home,
  lz(hub_c_pair.dr.ctx.config).network_backends
);
local published_entrypoints = [
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a_requester.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b_requester.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_requester.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_backends_requester.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_a_acceptor.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_b_acceptor.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_c_acceptor.jsonnet',
  import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_network_hub_c_backends_acceptor.jsonnet',
];

{
  all_3_published_same_hub_pairs_pass:
    std.length(published_combinations) == 3 &&
    collections.all([item.passes for item in published_combinations]),
  factory_hub_e_pair_pass: factory_hub_e_pair.passes,
  failing_combinations: [item.name for item in combinations if !item.passes],
  hub_c_backends_pass:
    rpc(home_backends, hub_c_pair.home, 'DR').peer_region_name ==
      hub_c_pair.dr.ctx.config.region &&
    rpc(dr_backends, hub_c_pair.dr, 'HOME').peer_region_name ==
      hub_c_pair.home.ctx.config.region &&
    remote_destinations(home_backends, hub_c_pair.home, 'dr') ==
      hub_c_pair.dr.advertised_cidrs &&
    remote_destinations(dr_backends, hub_c_pair.dr, 'home') ==
      hub_c_pair.home.advertised_cidrs,
  hub_c_home_destinations:
    remote_destinations(home_backends, hub_c_pair.home, 'dr'),
  hub_c_dr_destinations:
    remote_destinations(dr_backends, hub_c_pair.dr, 'home'),
  published_entrypoints_render:
    collections.all([
      std.objectHas(document, 'network_configuration')
      for document in published_entrypoints
    ]),
}
