// VCN address spaces cannot overlap between home and DR.
// error_contains: Home and DR VCN CIDRs contains overlapping CIDRs
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(
  home,
  dr + {
    hub+: { network+: { vcn: '10.0.0.0/21' } },
    disaster_recovery+: {
      rpc+: { advertised_cidrs: ['10.0.0.0/21'] },
    },
  }
).home
