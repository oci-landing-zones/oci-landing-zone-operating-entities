local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.uc2_hub_e.config).hub_post
