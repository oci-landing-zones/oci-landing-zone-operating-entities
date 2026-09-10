// A DR pair cannot cross OCI realms.
// error_contains: DR pair must use the same OCI realm
local validate = import 'gen/dr_pair.libsonnet';
local home = import 'tests/gen/testdata/dr/home_hub_b.jsonnet';
local dr = import 'tests/gen/testdata/dr/dr_hub_e.jsonnet';

validate(home, dr + { realm: 'oc19' }).home
