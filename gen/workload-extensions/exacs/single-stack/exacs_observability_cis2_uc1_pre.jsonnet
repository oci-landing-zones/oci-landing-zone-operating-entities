local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.uc1.config).observability_cis2_pre
