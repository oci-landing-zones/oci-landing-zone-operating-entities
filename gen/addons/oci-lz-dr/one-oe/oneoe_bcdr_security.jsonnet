local profiles = import './profiles.libsonnet';
local security = import './security.libsonnet';

security(profiles.hub_a)
