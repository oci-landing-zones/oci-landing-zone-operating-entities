local generate = import '../../../../landing_zone_multi.jsonnet';
local profiles = import '../profiles.libsonnet';

generate(profiles.hub_a + { cis_level: 1 })['security_cis1.json']
