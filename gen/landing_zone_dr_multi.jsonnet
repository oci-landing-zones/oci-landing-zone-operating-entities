// Generate network-only outputs for one side of a validated home/DR pair.
// Usage: jsonnet --multi output/ --tla-code-file home_config=home.json \
//   --tla-code-file dr_config=dr.json --tla-str side=home \
//   gen/landing_zone_dr_multi.jsonnet
function(home_config, dr_config, side)
  local validate = import 'dr_pair.libsonnet';
  local lz = import 'landing_zone.libsonnet';
  local acceptor = import 'addons/oci-lz-dr/one-oe/rpc_acceptor.libsonnet';
  local requester = import 'addons/oci-lz-dr/one-oe/rpc_requester.libsonnet';
  local pair = validate(home_config, dr_config);
  local home_lz = lz(pair.home.ctx.config);
  local dr_lz = lz(pair.dr.ctx.config);
  local home_outputs = {
    'network.json': home_lz.network,
    'network_rpc_acceptor.json': acceptor(pair.home, pair.dr, home_lz.network),
  } + (if home_lz.network_pre != null then {
    'network_pre.json': home_lz.network_pre,
  } else {}) + (if home_lz.network_backends != null then {
    'network_backends.json': home_lz.network_backends,
    'network_backends_rpc_acceptor.json':
      acceptor(pair.home, pair.dr, home_lz.network_backends),
  } else {});
  local dr_outputs = {
    'network.json': dr_lz.network,
    'network_rpc_requester.json': requester(pair.dr, pair.home, dr_lz.network),
  } + (if dr_lz.network_pre != null then {
    'network_pre.json': dr_lz.network_pre,
  } else {}) + (if dr_lz.network_backends != null then {
    'network_backends.json': dr_lz.network_backends,
    'network_backends_rpc_requester.json':
      requester(pair.dr, pair.home, dr_lz.network_backends),
  } else {});
  assert std.member(['home', 'dr'], side) :
    'DR output side must be home or dr';
  if side == 'home' then home_outputs else dr_outputs
