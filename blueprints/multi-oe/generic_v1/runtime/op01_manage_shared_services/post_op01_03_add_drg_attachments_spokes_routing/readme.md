# POST.OP.01.03 – Add OE DRG attachments and routing

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. Network Configuration changes](#2-network-configuration-changes)</br>
[2.1 DRG Attachments and Routing](#21-drg-attachments-and-routing)</br>
[2.2 VCNs Routing](#22-vcns-routing)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.01.03 |
| **OP. NAME** | Add OE DRG Attachments, DRG and VCN routing | 
| **OBJECTIVE** | After on-boarding a new OE, we add the DRG attachments to the new OE VCNs and update the Hub VCN routing to make the communications possible. |
| **TARGET RESOURCES** | - **Networking**: DRG Attachments, DRG Routing and VCN Routing. |
| **NETWORK CONFIG** |[open_lz_oe_01_network.auto.tfvars.json](../final_configs_after_postops/open_lz_shared_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Landing Zone Network](https://github.com/oci-landing-zones/terraform-oci-modules-networking)  |
| **DETAILS** |  For more details refer to the [OCI Open LZ Multi-OE Design document](/blueprints/multi-oe/generic_v1/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf).|
| **PRE-ACTIVITIES** | [OP.01 Shared Services](../readme.md) executed.</br>[OP.02 – Manage OE:](../../op02_manage_oes/oe01/readme.md).</br>[POST.OP01.02: Update routing with NFW Private IP](../post_op01_02_update_routing_nfw_ip/readme.md). |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [<img src="../../../../../commons/images/DeployToOCI.svg"  height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.10.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “rms-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.5.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.01](../readme.md). |

&nbsp; 

## **2. Network Configuration Changes**

After the on-boarding of the new OE, different OE spoke VCNs will be created. To be able to communicate the different spokes between them and also with the hub, it is needed to attach the VCNs to the central DRG, managed by the Central Operations Team. It is also required to update the different hub VCN route tables to add the spoke VCNs destinations and force the network traffic to go through the North-South or East-West NFWs. We also have to consider the DRG route tables (not confuse with the VCN Route tables), that will tell the different network packets where to go when they reach a DRG.

We can see the different changes in our example in the following diagram:

![Diagram](../diagrams/OCI_Open_LZ_SharedInfrastructure_Network_HubRouting.jpg)

### **2.1. DRG Attachments and Routing**

For the creation of the DRG Attachments and routing, we've to update the configuration in the following way:

```
"non_vcn_specific_gateways": {
    "dynamic_routing_gateways": {
        "DRG-FRA-HUB-KEY": {
            "display_name": "drg-fra-hub",
            "drg_attachments": {
                "DRGATT-FRA-HUB-VCN-KEY": {
                    "display_name": "drgatt-fra-hub-vcn",
                    "drg_route_table_key": "DRG-RT-FRA-HUB-KEY",
                    "network_details": {
                        "attached_resource_key": "VCN-FRA-HUB-KEY",
                        "type": "VCN",
                        "route_table_key": "RT-00-HUB-VCN-INGRESS-KEY"
                    }
                },
                "DRGATT-FRA-HUB-VCN-FRA-OE01-CO-KEY": {
                    "display_name": "drgatt-fra-hub-fra-oe01-co-vcn",
                    "drg_route_table_key": "DRG-RT-FRA-SPOKES-KEY",
                    "network_details": {
                        "attached_resource_id": "<VCN vcn-fra-oe01-co OCID>",
                        "type": "VCN"
                    }
                },
                "DRGATT-FRA-HUB-VCN-FRA-OE01-DEV-KEY": {
                    "display_name": "drgatt-fra-hub-fra-oe01-dev-vcn",
                    "drg_route_table_key": "DRG-RT-FRA-SPOKES-KEY",
                    "network_details": {
                        "attached_resource_id": "<VCN vcn-fra-oe01-dev OCID>",
                        "type": "VCN"
                    }
                },
                "DRGATT-FRA-HUB-VCN-FRA-OE01-NP-KEY": {
                    "display_name": "drgatt-fra-hub-fra-oe01-np-vcn",
                    "drg_route_table_key": "DRG-RT-FRA-SPOKES-KEY",
                    "network_details": {
                        "attached_resource_id": "<VCN vcn-fra-oe01-np OCID>",
                        "type": "VCN"
                    }
                },
                "DRGATT-FRA-HUB-VCN-FRA-OE01-P-KEY": {
                    "display_name": "drgatt-fra-hub-fra-oe01-p-vcn",
                    "drg_route_table_key": "DRG-RT-FRA-SPOKES-KEY",
                    "network_details": {
                        "attached_resource_id": "<VCN vcn-fra-oe01-p OCID>",
                        "type": "VCN"
                    }
                }
            },
            "drg_route_distributions": {
                "IMPORT-HUB-RTD-KEY": {
                    "display_name": "import-rtd-hub",
                    "distribution_type": "IMPORT",
                    "statements": {
                        "drg_route_distribution_vcn": {
                            "priority": 1,
                            "action": "ACCEPT",
                            "match_criteria": {
                                "match_type": "DRG_ATTACHMENT_TYPE",
                                "attachment_type": "VCN"
                            }
                        }
                    }
                }
            },
            "drg_route_tables": {
                "DRG-RT-FRA-HUB-KEY": {
                    "display_name": "drg-rt-fra-hub",
                    "import_drg_route_distribution_key": "IMPORT-HUB-RTD-KEY",
                    "is_ecmp_enabled": false,
                    "route_tables": {}
                },
                "DRG-RT-FRA-SPOKES-KEY": {
                    "display_name": "drg-rt-fra-spokes",
                    "is_ecmp_enabled": false,
                    "route_tables": {
                        "DRG-RT-FRA-SPOKES-STATIC-ROUTE": {
                            "destination": "0.0.0.0/0",
                            "destination_type": "VCN",
                            "next_hop_drg_attachment_key": "DRGATT-FRA-HUB-VCN-KEY"
                        }
                    }
                }
            }
        }
    },
}
```

As you can see, we're updating the attachment section, where initially we used to have just the Hub VCN attachment (*"DRGATT-FRA-HUB-VCN-KEY"*), with the attachments for the OE01 VCNs for DEV, NP and P environments as *"DRGATT-FRA-HUB-VCN-FRA-OE01-DEV-KEY"*, *"DRGATT-FRA-HUB-VCN-FRA-OE01-NP-KEY"* and *"DRGATT-FRA-HUB-VCN-FRA-OE01-P-KEY"* keys. We've to replace the "attached_resource_id" with the corresponding value of the spoke VCN OCID. The OP.02 operation is run by the Central Operations Team, so the VCN OCID of the new spokes is an information available to this team. Thus, they can control what VCNs they attach to the hub and which don't. No other teams (OE/Project), must have IAM policies permissions to be able to create attachments for security reasons.

**Notice** that in the Hub DRG Attachment (*"DRGATT-FRA-HUB-VCN-KEY"*), we're also configuring a route table for the VCN attachment, indicating that the VCN Route table "RT-00-HUB-VCN-INGRESS-KEY" will be used. As we'll see later in the VCNs Routing section, this route table is used to route the ingress traffic to the Hub VCN.

Another important information to define in the attachments is the DRG route tables to use. As you can see we have a couple of DRG Route Tables (in blue in the diagram):

* **Hub DRG Route Table**, called *"DRG-RT-FRA-HUB-KEY"*. This DRG Route table is a dynamic one, meaning that we don't have to define the needed routes to reach the spokes, as we would get them dynamically from their CIDR blocks. However, we've to define the import route distribution (*"IMPORT-HUB-RTD-KEY"*) with the criteria to gather these routes specifying that it is a DRG attachment of type VCN. 
  
* **Spokes DRG Route Table**, called *"DRG-RT-FRA-SPOKES-KEY"*. This DRG, in contrast with the Hub, has just an static route meaning that whenever we reach the DRG, for any destination (0.0.0.0/0), the next hop will be the Hub DRG attachment, eventually sending the traffic North-South or East-West firewalls to control and/or inspect the traffic.

### **2.2. VCNs Routing**

For the Hub VCN Routing, we've to modify the existing route tables to include the destinations to the different spokes. The affected VCN route tables are shown in the diagram in red.

The changes in the VCN route tables configuration are:

```
"route_tables": {
    "RT-00-HUB-VCN-INGRESS-KEY": {
        "display_name": "rt-00-hub-vcn-ingress",
        "route_rules": {
            "rt_hub_def_sn": {
                "description": "Route outgoing traffic",
                "destination": "0.0.0.0/0",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_hub_lb_sn": {
                "description": "Route incoming traffic to Hub LB subnet",
                "destination": "10.0.0.0/24",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_co_vcn": {
                "description": "Route to spoke OE01 Common",
                "destination": "172.168.0.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<EW PRIVATE IP OCID>"
            },
            "rt_oe01_dev_vcn": {
                "description": "Route to spoke OE01 Development",
                "destination": "172.168.2.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<EW PRIVATE IP OCID>"
            },
            "rt_oe01_np_vcn": {
                "description": "Route to spoke OE01 Non-Production",
                "destination": "172.168.4.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<EW PRIVATE IP OCID>"
            },
            "rt_oe01_p_vcn": {
                "description": "Route to spoke OE01 Production",
                "destination": "172.168.6.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<EW PRIVATE IP OCID>"
            }
        }
    },
    "RT-01-HUB-VCN-LB-KEY": {
        "display_name": "rt-01-hub-vcn-lb",
        "route_rules": {
            "internet_route": {
                "description": "Route for internet access",
                "destination": "0.0.0.0/0",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "IG-FRA-HUB-KEY"
            },
            "rt-oe01-dev-vcn": {
                "description": "Route to spoke OE01 Development",
                "destination": "172.168.2.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_np_vcn": {
                "description": "Route to spoke OE01 Non-Production",
                "destination": "172.168.4.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_p_vcn": {
                "description": "Route to spoke OE01 Production",
                "destination": "172.168.6.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            }
        }
    },
    "RT-02-HUB-VCN-NFWNS-KEY": {
        "display_name": "rt-02-hub-vcn-nfwns",
        "freeform_tags": null,
        "route_rules": {
            "ngw_route": {
                "description": "Route for North-South NFW to NAT GW",
                "destination": "0.0.0.0/0",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "NG-FRA-HUB-KEY"
            },
            "rt_oe01_co_vcn": {
                "description": "Route for North-South NFW to OE01 Common VCN",
                "destination": "172.168.0.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            },
            "rt_oe01_dev_vcn": {
                "description": "Route for North-South NFW to OE01 Dev VCN",
                "destination": "172.168.2.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            },
            "rt_oe01_np_vcn": {
                "description": "Route for North-South NFW to OE01 Non-Prod VCN",
                "destination": "172.168.4.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            },
            "rt_oe01_p_vcn": {
                "description": "Route for North-South NFW to OE01 Prod VCN",
                "destination": "172.168.6.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            }
        }
    },
    "RT-03-HUB-VCN-NFWEW-KEY": {
        "display_name": "rt-03-hub-vcn-nfwew",
        "freeform_tags": null,
        "route_rules": {
            "rt_oe01_co_vcn": {
                "description": "Route for East-West NFW to OE01 Common VCN",
                "destination": "172.168.0.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            },
            "rt_oe01_dev_vcn": {
                "description": "Route for East-West NFW to OE01 Dev VCN",
                "destination": "172.168.2.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            },
            "rt_oe01_np_vcn": {
                "description": "Route for East-West NFW to OE01 Non-Prod VCN",
                "destination": "172.168.4.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            },
            "rt_oe01_p_vcn": {
                "description": "Route for East-West NFW to OE01 Prod VCN",
                "destination": "172.168.6.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_key": "DRG-FRA-HUB-KEY"
            }
        }
    },
    "RT-04-HUB-VCN-NATGW-KEY": {
        "display_name": "rt-04-hub-vcn-natgw",
        "freeform_tags": null,
        "route_rules": {
            "nat_route": {
                "description": "Route for ngw",
                "destination": "0.0.0.0/0",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_co_vcn": {
                "description": "Route for NGW to force traffic through NFW for OE01 Common VCN",
                "destination": "172.168.0.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_dev_vcn": {
                "description": "Route for NGW to force traffic through NFW for OE01 Dev VCN",
                "destination": "172.168.2.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_np_vcn": {
                "description": "Route for NGW to force traffic through NFW for OE01 Non-Prod VCN",
                "destination": "172.168.4.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            },
            "rt_oe01_p_vcn": {
                "description": "Route for NGW to force traffic through NFW for OE01 Prod VCN",
                "destination": "172.168.6.0/23",
                "destination_type": "CIDR_BLOCK",
                "network_entity_id": "<NS PRIVATE IP OCID>"
            }
        }
    },
(...)
},
```

As you can see, we're updating the different route tables to add routing rules to be able to reach the spokes' CIDR Blocks. It'd depend on the route to force the traffic to go through the North-South or the East-West traffic. Remember that we'll use the North-South traffic for any incoming/outgoing traffic to OCI, meaning access from the Internet, on-prem/CSPs or through a NAT GW. 

In this way, let's revidw more information about each of the route tables:

* **Hub VCN Ingress traffic**, called *RT-00-HUB-VCN-INGRESS-KEY*. This route table is used by the Hub DRG Attachment to route the ingress traffic. Basically says:
  *  Any packet going to the Hub VCN LB subnet must go through the NS FW.
  
  *  Any packet going to the OE01 spokes' CIDR blocks (172.168.0.0/23, 172.168.2.0/23, 172.168.4.0/23 and 172.168.6.0/23), must go through the EW FW.
  
  *  Any packet going to the internet, must go through the NS FW.
  
* **Hub VCN LB subnet**, called *RT-01-HUB-VCN-LB-KEY*. This route table is used by the Load Balancer subnet. Basically says:
  * Any packet going to the to the OE01 spokes' CIDR blocks (172.168.2.0/23, 172.168.4.0/23 and 172.168.6.0/23), must go through the NS FW.
  
  * Any packet going to the internet, must go through the Internet Gateway.

* **Hub VCN NS subnet**, called *RT-02-HUB-VCN-NFWNS-KEY*. This route table is used by the North-South FW subnet. Basically says:
  * Any packet going to the to the OE01 spokes' CIDR blocks (172.168.0.0/23, 172.168.2.0/23, 172.168.4.0/23 and 172.168.6.0/23), must go through the DRG.
  
  * Any packet going to the internet, must go through the NAT Gateway.

* **Hub VCN EW subnet**, called *RT-03-HUB-VCN-NFWEW-KEY*. This route table is used by the East-West FW subnet. Basically says:
  * Any packet going to the to the OE01 spokes' CIDR blocks (172.168.0.0/23, 172.168.2.0/23, 172.168.4.0/23 and 172.168.6.0/23), must go through the DRG.

* **Hub VCN NAT GW**, called *RT-04-HUB-VCN-NATGW-KEY*. This route table is used by the NAT Gateway. Basically says:
  * Any packet going to the to the OE01 spokes' CIDR blocks (172.168.0.0/23, 172.168.2.0/23, 172.168.4.0/23 and 172.168.6.0/23), must go through the NAT Gateway.

**NOTICE:** We've to update the route rules going to the EW FW with the corresponding FW Private IP OCID, replacing the "*EW PRIVATE IP OCID*", with the Private IP that we can get from the OP.01 state file or the apply output of the first OP.01 operation.

After updating your network configuration, remember to run the plan/apply to update your OP.01 operation configuration.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
