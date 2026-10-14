local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.multi_stack.uc2_config).observability
