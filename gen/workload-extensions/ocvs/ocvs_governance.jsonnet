local output = import './output_builder.libsonnet';
local profiles = import './profiles.libsonnet';

output(profiles.prod_hub_e).ocvs_governance
