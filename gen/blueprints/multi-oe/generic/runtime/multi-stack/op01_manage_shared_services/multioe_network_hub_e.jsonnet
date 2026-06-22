local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_e.config).op01.network_hub_e
