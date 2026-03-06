local cis2 = import 'oneoe_observability_cis2_pre.jsonnet';

cis2 {
    "logging_configuration": {
        "default_compartment_id"                : "CMP-LZ-SECURITY-KEY",

        "flow_logs": {
            "LOG-LZ-PREPROD-SUBNET-FLOW-KEY": {
                "log_group_id"                  : "LGRP-LZ-PREPROD-VCN-FLOW-KEY",
                "target_compartment_ids"        : ["CMP-LZ-PREPROD-NETWORK-KEY"],
                "target_resource_type"          : "subnet"
            },

            "LOG-LZ-PREPROD-VCN-FLOW-KEY": {
                "log_group_id"                  : "LGRP-LZ-PREPROD-VCN-FLOW-KEY",
                "target_compartment_ids"        : ["CMP-LZ-PREPROD-NETWORK-KEY"],
                "target_resource_type"          : "vcn"
            },

            "LOG-LZ-PROD-SUBNET-FLOW-KEY": {
                "log_group_id"                  : "LGRP-LZ-PROD-VCN-FLOW-KEY",
                "target_compartment_ids"        : ["CMP-LZ-PROD-NETWORK-KEY"],
                "target_resource_type"          : "subnet"
            },

            "LOG-LZ-PROD-VCN-FLOW-KEY": {
                "log_group_id"                  : "LGRP-LZ-PROD-VCN-FLOW-KEY",
                "target_compartment_ids"        : ["CMP-LZ-PROD-NETWORK-KEY"],
                "target_resource_type"          : "vcn"
            },

            "LOG-LZ-SUBNET-FLOW-KEY": {
                "log_group_id"                  : "LGRP-LZ-VCN-FLOW-KEY",
                "target_compartment_ids"        : ["CMP-LZ-NETWORK-KEY"],
                "target_resource_type"          : "subnet"
            },

            "LOG-LZ-VCN-FLOW-KEY": {
                "log_group_id"                  : "LGRP-LZ-VCN-FLOW-KEY",
                "target_compartment_ids"        : ["CMP-LZ-NETWORK-KEY"],
                "target_resource_type"          : "vcn"
            }
        },

        "log_groups": {
            "LGRP-LZ-PREPROD-VCN-FLOW-KEY": {
                "name"                          : "lgrp-lz-preprod-vcn-flow",
                "compartment_id"                : "CMP-LZ-PREPROD-SECURITY-KEY"
            },

            "LGRP-LZ-PROD-VCN-FLOW-KEY": {
                "name"                          : "lgrp-lz-prod-vcn-flow",
                "compartment_id"                : "CMP-LZ-PROD-SECURITY-KEY"
            },

            "LGRP-LZ-VCN-FLOW-KEY": {
                "name"                          : "lgrp-lz-vcn-flow"
            }
        }
    },
    
    }


