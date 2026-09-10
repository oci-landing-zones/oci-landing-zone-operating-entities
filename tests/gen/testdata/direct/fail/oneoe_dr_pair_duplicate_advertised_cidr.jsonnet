// A DR side cannot advertise the same VCN twice.
// error_contains: home advertised CIDRs must not contain duplicates
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(
  home + {
    disaster_recovery+: {
      rpc+: {
        advertised_cidrs: ['10.0.0.0/21', '10.0.0.0/21'],
      },
    },
  },
  dr
).home
