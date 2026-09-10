// Advertised CIDRs must exactly match a VCN from their own regional config.
// error_contains: home advertised CIDR 10.9.0.0/21 is not a local VCN CIDR
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(
  home + {
    disaster_recovery+: {
      rpc+: { advertised_cidrs: ['10.9.0.0/21'] },
    },
  },
  dr
).home
