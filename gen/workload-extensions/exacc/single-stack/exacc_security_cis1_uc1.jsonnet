local profiles = import './profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.single_stack.config).security_cis1
