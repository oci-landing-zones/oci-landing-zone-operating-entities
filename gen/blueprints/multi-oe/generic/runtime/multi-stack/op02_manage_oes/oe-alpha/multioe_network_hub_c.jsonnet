local profiles = import '../../profiles.libsonnet';
local published = import '../../published.libsonnet';
published.render(profiles.hub_c.config).op02.oe_alpha.network_hub_c
