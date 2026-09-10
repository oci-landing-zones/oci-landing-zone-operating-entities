// RPC routing is selected from each local hub while naming follows its region.
// contains: "route_table_mapping_is_exact": true
// contains: "routing_modes_are_exact": true
local validate = import 'gen/dr_pair.libsonnet';
local adapter = import 'gen/addons/oci-lz-dr/one-oe/rpc_hub_adapter.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

local side(kind) = validate(
  home,
  dr + { hub+: { kind: kind } }
).dr;
local actual = {
  [kind]: adapter(side(kind))
  for kind in ['hub_a', 'hub_b', 'hub_c', 'hub_e']
};

{
  route_table_mapping_is_exact: {
    hub_a: actual.hub_a.firewall_egress_route_table,
    hub_b: actual.hub_b.firewall_egress_route_table,
    hub_c: actual.hub_c.firewall_egress_route_table,
    hub_e: actual.hub_e.firewall_egress_route_table,
  } == {
    hub_a: 'RT-LHR-LZ-HUB-FW-INT-KEY',
    hub_b: 'RT-LHR-LZ-HUB-FW-KEY',
    hub_c: 'RT-LHR-LZ-HUB-TRUST-KEY',
    hub_e: null,
  },
  routing_modes_are_exact:
    actual.hub_a.mode == 'firewall' &&
    actual.hub_b.mode == 'firewall' &&
    actual.hub_c.mode == 'firewall' &&
    actual.hub_e.mode == 'direct',
}
