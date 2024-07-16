# OP.03 - Post-op Load Balancer (optional) <!-- omit from toc -->
## **Table of Contents** <!-- omit from toc -->
- [**1. Summary**](#1-summary)
- [**2. Compartments**](#2-compartments)
- [**3. Network**](#3-network)


## **1. Summary**

|                      |                                         |
| -------------------- | --------------------------------------- |
| **OP. ID**           | OP.3                                    |
| **OP. NAME**         | Post-op Load Balancer (optional)        |
| **OBJECTIVE**        | Provision Load Balancer subnet for OCVS |
| **TARGET RESOURCES** | VCN, Load Balancer                      |

This is an optional post deployment operation to provision a Load Balancer Subnet for the OCVS with predefined routing and security rules. Load Balancer subnet can be used for creating Load Balancer for exposing parts of the OCVS either internally or externally.

## **2. Compartments**
Provision ocvs-lb compartment by modifying the `oci_open_lz_one-oe_identity.auto.tfvars.json` file to add following in the OCVS children:
```json
"CMP-P-PLATFORM-OCVS-LB-KEY": {
    "name": "cmp-p-platform-ocvs-lb",
    "description": "oci-oneoe-customer Production environment, Platform OCVS, LB layer",
    "freeform_tags": {
        "oci-open-lz": "oci-oneoe-lzp",
        "oci-open-lz-cmp": "cmp-p-platform-ocvs-lb"
    }
}
```

## **3. Network**
Provision LB subnet, routes, security lists by modifing the `oci_open_lz_one-oe_identity.auto.tfvars.json` file to add following parts of configuration.

Route table to path `network_configuration.network_configuration_categories["VCN-FRA-P-OCVS-KEY"].route_tables`
```json
"RT-01-P-OCVS-VCN-LB-KEY": {
    "display_name": "rt-01-p-ocvs-vcn-lb",
    "route_rules": {
        "sgw_route": {
            "description": "Route for sgw",
            "destination": "all-services",
            "destination_type": "SERVICE_CIDR_BLOCK",
            "network_entity_key": "SG-FRA-P-OVCS-KEY"
        },
        "drg_route": {
            "description": "Route to DRG",
            "destination": "0.0.0.0/0",
            "destination_type": "CIDR_BLOCK",
            "network_entity_id": "<OCID-DRG-HUB>"
        }
    }
}
```

Security list to path `network_configuration.network_configuration_categories["VCN-FRA-P-OCVS-KEY"].security_lists`
```json
"SL-01-P-OCVS-VCN-LB-KEY": {
    "display_name": "sl-01-p-ocvs-vcn-lb",
    "egress_rules": [
        {
            "description": "egress to 0.0.0.0/0 over ALL protocols",
            "dst": "0.0.0.0/0",
            "dst_type": "CIDR_BLOCK",
            "protocol": "ALL",
            "stateless": false
        }
    ],
    "ingress_rules": [
        {
            "description": "ingress from 0.0.0.0/0 ALL ports",
            "protocol": "ALL",
            "src": "0.0.0.0/0",
            "src_type": "CIDR_BLOCK",
            "stateless": false
        }
    ]
}
```

Subnets to path `network_configuration.network_configuration_categories["VCN-FRA-P-OCVS-KEY"].subnets`
```json
"SN-FRA-P-LB-KEY": {
    "cidr_block": "10.1.28.0/24",
    "dhcp_options_key": "default_dhcp_options",
    "display_name": "sn-fra-p-ocvs-lb",
    "dns_label": "snfrapocvslb",
    "prohibit_internet_ingress": true,
    "prohibit_public_ip_on_vnic": true,
    "route_table_key": "RT-01-P-OCVS-VCN-LB-KEY",
    "security_list_keys": [
        "SL-01-P-OCVS-VCN-LB-KEY"
    ]
}
```

# License <!-- omit from toc -->

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.
