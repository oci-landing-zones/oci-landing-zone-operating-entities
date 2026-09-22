local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.network(profiles.cross_tenancy_acceptor)
