local generate = import '../../../../landing_zone_multi.jsonnet';
local profiles = import '../profiles.libsonnet';

generate(profiles.hub_a)['security_cis2.json']
