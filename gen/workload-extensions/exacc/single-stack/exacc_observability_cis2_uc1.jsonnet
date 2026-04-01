local one_oe = import '../../../blueprints/one-oe/runtime/one-stack/oneoe_observability_cis2.jsonnet';
local exacc_observability = import '../exacc_observability.libsonnet';

one_oe + exacc_observability
