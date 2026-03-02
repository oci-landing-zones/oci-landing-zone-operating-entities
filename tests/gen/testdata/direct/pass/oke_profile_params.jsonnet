local single_profiles =
  import "../../../../../gen/workload-extensions/oke/simple/single-stack/profiles.libsonnet";
local multi_profiles =
  import "../../../../../gen/workload-extensions/oke/simple/multi-stack/profiles.libsonnet";

{
  single_stack: single_profiles.single_stack.config.environments.prod.platforms.oke.extension.params,
  multi_stack: multi_profiles.multi_stack.config.environments.prod.platforms.oke.extension.params,
}
