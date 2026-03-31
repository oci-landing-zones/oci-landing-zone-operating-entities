local common = import 'oneoe_observability_common.libsonnet';

common.pre_base {
    "service_connectors_configuration"+: {
        "buckets"+: {
            "BKT-LZ-SERVICE-CONNECTOR"+: {
                "cis_level"                     : "2",
                "kms_key_id"                    : "KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY"
            }
        }
    }
}
