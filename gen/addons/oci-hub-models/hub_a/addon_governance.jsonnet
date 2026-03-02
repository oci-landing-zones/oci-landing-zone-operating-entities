local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render_governance(profiles.hub_a.config)
