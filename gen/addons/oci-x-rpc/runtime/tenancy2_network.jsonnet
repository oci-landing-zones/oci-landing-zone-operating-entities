local profiles = import '../profiles.libsonnet';
local published = import '../published.libsonnet';
published.manual_network_reference(profiles.oe1_reference)
