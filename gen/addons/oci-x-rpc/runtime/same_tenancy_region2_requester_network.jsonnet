local lz = import '../../../landing_zone.libsonnet';
local profiles = import '../profiles.libsonnet';
lz(profiles.same_tenancy_requestor).network
