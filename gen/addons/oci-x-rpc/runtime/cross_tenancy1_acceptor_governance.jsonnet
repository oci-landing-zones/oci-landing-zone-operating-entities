local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.governance(profiles.cross_tenancy_acceptor)
