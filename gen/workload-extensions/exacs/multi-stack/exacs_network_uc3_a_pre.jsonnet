local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.uc3_hub_a.config).network_pre
