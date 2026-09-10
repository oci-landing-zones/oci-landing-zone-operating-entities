local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.network(profiles.same_tenancy_acceptor)
