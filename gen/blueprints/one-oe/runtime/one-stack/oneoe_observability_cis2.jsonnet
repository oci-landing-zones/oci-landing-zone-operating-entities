local common = import 'oneoe_observability_common.libsonnet';
local cis2 = import 'oneoe_observability_cis2_pre.jsonnet';

cis2 {
    "logging_configuration": common.logging_configuration,
}
