local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.complete(profiles.oe1_reference).governance
