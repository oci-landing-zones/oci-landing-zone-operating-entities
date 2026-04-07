local one_oe = import '../../../blueprints/one-oe/runtime/one-stack/oneoe_observability_cis2.jsonnet';
local exacs_observability = import '../exacs_observability.libsonnet';

one_oe + exacs_observability({
  include_logging: false,
})
