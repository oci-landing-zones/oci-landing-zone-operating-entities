{
    "oke_workers_configuration": {
        "default_compartment_id"         : "CMP-LZP-P-PLATFORM-OKE-KEY",

        "node_pools": {
            "NODEPOOL-QUICKSTART-1": {
                "name"                   : "node-pool-quickstart",
                "cluster_id"             : "OKE-QUICKSTART-CLUSTER",
                "enable_cycling"         : false,
                "size"                   : 1,

                "cloud_init": [
                    {
                        "content"        : "runcmd:\n  - sudo /usr/libexec/oci-growfs -y\n",
                        "content_type"   : "text/cloud-config"
                    }
                ],

                "freeform_tags": {
                    "cluster"            : "oke-quickstart"
                },

                "networking": {
                    "pods_nsg_ids"       : ["NSG-PROD-PODS"],
                    "pods_subnet_id"     : "SN-PROD-OKE-PODS-KEY",
                    "workers_nsg_ids"    : ["NSG-PROD-WORKERS"],
                    "workers_subnet_id"  : "SN-PROD-OKE-WORKERS-KEY"
                },

                "node_config_details": {
                    "node_shape"         : "VM.Standard.E5.Flex",

                    "flex_shape_settings": {
                        "memory"         : 8,
                        "ocpus"          : 1
                    }
                }
            }
        }
    }
}
