local common = import 'oneoe_observability_common.libsonnet';
local cis1 = import 'oneoe_observability_cis1_pre.jsonnet';

cis1 {
    "logging_configuration": common.logging_configuration,
}