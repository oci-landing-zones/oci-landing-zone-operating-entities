local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.single_stack.uc2_config).security_cis1
