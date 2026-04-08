{
  logging_configuration+: {
    default_compartment_id: "CMP-LZ-SECURITY-KEY",

    flow_logs+: {
      "LOG-LZ-SHARED-EXACS-SUBNET-FLOW-KEY": {
        "log_group_id": "LGRP-LZ-SHARED-EXACS-VCN-FLOW-KEY",
        "target_compartment_ids": ["CMP-LZ-NETWORK-KEY"],
        "target_resource_type": "subnet",
      },

      "LOG-LZ-SHARED-EXACS-VCN-FLOW-KEY": {
        "log_group_id": "LGRP-LZ-SHARED-EXACS-VCN-FLOW-KEY",
        "target_compartment_ids": ["CMP-LZ-NETWORK-KEY"],
        "target_resource_type": "vcn",
      },
    },

    log_groups+: {
      "LGRP-LZ-SHARED-EXACS-VCN-FLOW-KEY": {
        "name": "lgrp-lz-shared-exacs-vcn-flow",
      },
    },
  },
}
