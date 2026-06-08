local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.uc3.config).identity
