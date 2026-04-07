local one_oe = import '../../../blueprints/one-oe/runtime/one-stack/oneoe_observability_cis1_pre.jsonnet';
local exacs_observability = import '../exacs_observability.libsonnet';

one_oe + exacs_observability({
  shared_scope: true,
  include_logging: false,
})
