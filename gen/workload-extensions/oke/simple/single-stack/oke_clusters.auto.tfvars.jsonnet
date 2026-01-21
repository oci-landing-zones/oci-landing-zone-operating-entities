{
    "oke_clusters_configuration": {
        "default_compartment_id"                       : "CMP-LZ-PROD-PLATFORM-OKE-KEY",

        "clusters": {
            "OKE-QUICKSTART-CLUSTER": {
                "name"                                 : "oke-quickstart",
                "cni_type"                             : "native",
                "is_enhanced"                          : true,
                "kubernetes_version"                   : "v1.31.1",
                "pods_cidr"                            : "10.244.0.0/16",
                "services_cidr"                        : "10.96.0.0/16",

                "networking": {
                    "api_endpoint_nsg_ids"             : ["NSG-FRA-LZ-PROD-PLATFORM-OKE-CP-KEY"],
                    "api_endpoint_subnet_id"           : "SN-FRA-LZ-PROD-OKE-CP-KEY",
                    "assign_public_ip_to_control_plane": false,
                    "is_api_endpoint_public"           : false,
                    "services_subnet_id"               : ["SN-FRA-LZ-PROD-OKE-INT-LB-KEY"],
                    "vcn_id"                           : "VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY"
                },

                "options": {
                    "add_ons": {
                        "dashboard_enabled"            : false,
                        "tiller_enabled"               : false
                    }
                }
            }
        }
    }
}
