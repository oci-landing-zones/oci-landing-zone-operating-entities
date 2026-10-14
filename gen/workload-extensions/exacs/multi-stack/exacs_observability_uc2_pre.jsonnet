local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.uc2.config).observability_pre
