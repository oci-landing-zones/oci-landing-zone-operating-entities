local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render_iam(profiles.hub_c.config)
