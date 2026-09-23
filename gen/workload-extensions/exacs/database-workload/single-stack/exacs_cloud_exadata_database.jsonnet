local profiles = import './profiles.libsonnet';
local published = import '../published.libsonnet';

published.single_stack(profiles.uc1.config)
