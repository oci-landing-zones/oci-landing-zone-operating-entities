local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.iam_fragment(profiles.cross_tenancy_acceptor)
