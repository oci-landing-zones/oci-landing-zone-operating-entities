local profiles = import './profiles.libsonnet';
local output = import './output_builder.libsonnet';
output(profiles.hub_e).observability_cis2_explicit
