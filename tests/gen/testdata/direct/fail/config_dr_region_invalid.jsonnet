// DR region must be a non-empty region string.
// error_contains: config.dr_region must be a non-empty string
local normalize = (import 'gen/config.libsonnet').normalize;
local defaults = import 'gen/defaults.libsonnet';
normalize(defaults.hub_b + { dr_region: [] })
