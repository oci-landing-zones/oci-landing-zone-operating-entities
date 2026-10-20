// DR region must differ from the primary deployment region.
// error_contains: config.dr_region must differ from config.region
local normalize = (import 'gen/config.libsonnet').normalize;
local defaults = import 'gen/defaults.libsonnet';
normalize(defaults.hub_b + { dr_region: 'eu-frankfurt-1' })
