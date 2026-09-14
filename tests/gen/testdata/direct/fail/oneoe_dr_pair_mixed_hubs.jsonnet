// A DR pair must use the same hub model in both regions.
// error_contains: DR pair hub models must match: home uses hub_b, dr uses hub_e
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(home, dr).home
