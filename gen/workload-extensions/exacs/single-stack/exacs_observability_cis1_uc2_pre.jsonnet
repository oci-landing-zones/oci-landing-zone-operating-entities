local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.uc2.config).observability_cis1_pre
