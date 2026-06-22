local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_b.config).op01.network_hub_b
