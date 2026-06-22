local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.render(profiles.hub_e.config).op01.observability_cis2_pre
