local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.uc3.config).observability_cis2_pre
