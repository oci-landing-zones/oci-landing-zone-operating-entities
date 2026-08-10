local profiles = import './profiles.libsonnet';
local observability = import './observability.libsonnet';

observability(profiles.hub_a).cis2
