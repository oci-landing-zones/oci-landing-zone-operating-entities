// Advertised VCNs must use canonical IPv4 CIDR notation.
// error_contains: home advertised_cidrs[0] must be a canonical IPv4 CIDR
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(
  home + {
    disaster_recovery+: {
      rpc+: { advertised_cidrs: ['10.0.0.1/21'] },
    },
  },
  dr
).home
