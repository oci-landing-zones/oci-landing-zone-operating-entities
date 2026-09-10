// A DR side must declare its RPC advertisement contract.
// error_contains: home disaster_recovery.rpc.advertised_cidrs must be present
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(
  home + { disaster_recovery: {} },
  dr
).home
