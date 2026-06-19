local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.network_fragment(profiles.cross_tenancy_requester)
