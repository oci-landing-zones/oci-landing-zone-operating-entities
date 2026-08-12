local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.iam(profiles.cross_tenancy_acceptor)
