local generate = import '../../../../landing_zone_multi.jsonnet';
local profiles = import '../profiles.libsonnet';

generate(profiles.hub_a)['observability_cis2.json']
