local profiles = import './profiles.libsonnet';
local lz = import '../../../../../landing_zone.libsonnet';
lz(profiles.hub_b.config).network_pre
