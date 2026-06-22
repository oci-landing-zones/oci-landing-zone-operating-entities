local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_c.config).op01.network_hub_c_pre
