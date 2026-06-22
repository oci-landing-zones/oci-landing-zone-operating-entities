local profiles = import './profiles.libsonnet';
local output_builder = import './output_builder.libsonnet';
output_builder(profiles.hub_a).network
