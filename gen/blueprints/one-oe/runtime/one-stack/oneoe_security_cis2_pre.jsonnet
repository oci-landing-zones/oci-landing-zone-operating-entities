local profiles = import './profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
lz(profiles.hub_a.config).security_cis2_pre
