# POST.OP.01.02 – Update routing with NFW Private IP

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. Network Configuration changes](#2-iam-configuration-changes)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.01.02 |
| **OP. NAME** | Update Routing with NFW Private IP | 
| **OBJECTIVE** | After a new OCI Network Firewall is deployed, an update in Hub routing tables is needed to force some routes to passthrough the NFW private IP OCID. |
| **TARGET RESOURCES** | - **Networking**: Routing Tables. |
| **NETWORK CONFIG** |[open_lz_oe_01_network.auto.tfvars.json](open_lz_oe_01_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking)  |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](../../../../design/OCI_Open_LZ.pdf).|
| **PRE-ACTIVITIES** | [OP.01 Shared Services](../../shared/readme.md) executed. |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [![Deploy_To_OCI](../../../../images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-open-lz/archive/refs/heads/master.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op02_manage_oes/oe01/open_lz_oe_01_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op02_manage_oes/oe01/open_lz_oe_01_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “orm-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.2.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.01](../readme.md). |

&nbsp; 

## **2. Network Configuration Changes**

After having the OCID of the Private IP VNIC of the new North-South OCI Network Firewall, update the route rules in the Hub VCN ingress route table (rt-00-hub-vcn), and the route for the NAT Gateway (rt-04-hub-vcn) with the route rules that contains the Private IP OCID of the firewall.

You can find out the North-South private IP OCID (*"ipv4address_ocid"*) in the generated terraform state file of the OP.01 or the outputs after the apply operation like:

```
"NFW-FRA-HUB-NS-KEY" = {
(...) 
      "display_name" = "nfw-fra-hub-ns"
      "id" = "ocid1.networkfirewall.oc1..."
      "ipv4address" = "192.168.1.10"
      "ipv4address_ocid" = "ocid1.privateip.oc1..."
```

You can add the following route rules *"rt_hub_def_sn"* and *"rt_hub_lb_sn"* to the route table *RT-00-HUB-VCN-INGRESS-KEY*, and the route rule *"nat_route"* of the route table *RT-04-HUB-VCN-NATGW-KEY* with the *"NS PRIVATE IP OCID"* in your network JSON configuration file for the OP.01 with the OCID of the NS FW *"ipv4address_ocid"* value:

```
...
"VCN-FRANKFURT-HUB-KEY": {
(...)
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
                }
            }
        },
        (...)
        "RT-04-HUB-VCN-NATGW-KEY": {
            "display_name": "rt-04-hub-vcn-natgw",
            "freeform_tags": null,
            "route_rules": {
                "nat_route": {
                    "description": "Route for ngw",
                    "destination": "0.0.0.0/0",
                    "destination_type": "CIDR_BLOCK",
                    "network_entity_id": "<NS PRIVATE IP OCID>"
                }
            }
        },
...
```

After updating this configuration and saving the changes, you would be able to re-run the plan/apply Terraform operations with ORM or Terraform CLI in the same way you did the OP.01.


# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.