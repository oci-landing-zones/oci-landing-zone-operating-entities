local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.network_fragment(profiles.same_tenancy_acceptor)
