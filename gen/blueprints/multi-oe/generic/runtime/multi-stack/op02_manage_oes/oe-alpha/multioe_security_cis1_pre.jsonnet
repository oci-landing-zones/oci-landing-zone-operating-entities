local profiles = import '../../profiles.libsonnet';
local published = import '../../published.libsonnet';
published.render(profiles.hub_e.config).op02.oe_alpha.security_cis1_pre
