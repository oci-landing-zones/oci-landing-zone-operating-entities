// A DR pair must use different regions.
// error_contains: DR pair regions must be different
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(home, dr + {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
}).home
