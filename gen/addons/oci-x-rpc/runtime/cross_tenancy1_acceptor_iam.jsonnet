local lz = import '../../../landing_zone.libsonnet';
local profiles = import '../profiles.libsonnet';
lz(profiles.cross_tenancy_acceptor).iam
