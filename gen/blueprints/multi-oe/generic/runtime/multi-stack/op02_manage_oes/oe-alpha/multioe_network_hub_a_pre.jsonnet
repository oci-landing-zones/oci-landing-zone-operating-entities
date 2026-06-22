local profiles = import '../../profiles.libsonnet';
local published = import '../../published.libsonnet';
published.render(profiles.hub_a.config).op02.oe_alpha.network_hub_a_pre
