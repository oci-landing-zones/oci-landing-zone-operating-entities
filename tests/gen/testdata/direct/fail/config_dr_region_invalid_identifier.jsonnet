// DR region cannot inject additional principals into the generated IAM statement.
// error_contains: config.dr_region must be an OCI region identifier
local normalize = (import 'gen/config.libsonnet').normalize;
local defaults = import 'gen/defaults.libsonnet';
normalize(defaults.hub_b + { dr_region: 'eu-amsterdam-1, any-user' })
