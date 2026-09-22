local profiles = import './profiles.libsonnet';
local output_builder = import './output_builder.libsonnet';
output_builder(profiles.single_stack).oke_security_cis1_pre
