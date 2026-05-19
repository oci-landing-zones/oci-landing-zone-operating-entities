local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.uc1_hub_e.config).network
