local profiles = import './profiles.libsonnet';
local published = import './output_builder.libsonnet';
published(profiles.hub_a).security_cis1
