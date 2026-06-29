local profiles = import './profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
lz(profiles.hub_e.config).observability_cis1_pre
