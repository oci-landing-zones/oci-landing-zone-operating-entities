local profiles = import './profiles.libsonnet';
local output_builder = import './output_builder.libsonnet';

output_builder(profiles.multi_stack).oke_governance
