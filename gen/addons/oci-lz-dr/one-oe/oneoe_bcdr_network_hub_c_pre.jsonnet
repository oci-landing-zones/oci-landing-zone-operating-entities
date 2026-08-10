local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';

lz(profiles.hub_c).network_pre
