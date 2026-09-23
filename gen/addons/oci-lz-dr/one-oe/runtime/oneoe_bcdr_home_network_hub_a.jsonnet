local profiles = import '../profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';

lz(profiles.home_hub_a).network
