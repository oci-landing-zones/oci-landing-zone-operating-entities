// Optional Recipe 02 CIS2 for the existing production compartment.
local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published(profiles.environment_cis2)
