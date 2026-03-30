local one_oe = import '../../../blueprints/one-oe/runtime/one-stack/oneoe_observability_cis1.jsonnet';
local exacs_observability = import '../exacs_observability.libsonnet';
local exacs_observability_logs = import '../exacs_observability_logs.libsonnet';

one_oe + exacs_observability + exacs_observability_logs

