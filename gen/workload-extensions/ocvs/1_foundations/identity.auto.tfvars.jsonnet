local output = import '../simple/single-stack/output_builder.libsonnet';
local profiles = import '../simple/single-stack/profiles.libsonnet';

output(profiles.prod_hub_e).identity
