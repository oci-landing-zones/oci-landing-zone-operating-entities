local profiles = import './profiles.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
lz(profiles.single_stack.config).security_cis2_pre
