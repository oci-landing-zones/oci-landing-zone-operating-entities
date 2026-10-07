local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.multi_stack.uc3_config).identity
