// Optional Recipe 02 CIS1 for the existing production compartment.
local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published(profiles.environment_cis1)
