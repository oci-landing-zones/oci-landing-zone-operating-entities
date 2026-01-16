## Management Plane Network Stack Deployment

The network stack manages the management plane networking configuration, including all the routing to customer VCNs.

The mgmt plane template VCNs are pre-configured with the following CIDR ranges:

- **central-hub-vcn**: 192.168.0.0/26
- **security-vcn**: 192.168.0.64/26
- **shared-services-vcn**: 192.168.0.128/26

The CIDR ranges can be changed in configuration files [network_initial_config.json](../mgmt-plane/network/network_initial_config.json) and [network_post_firewall_config.json](../mgmt-plane/network/network_post_firewall_config.json).

### Overall Deployment Sequence

This stack is executed in two different stages with a **PROGRESSIVELY UPDATED input configuration file**.

1. [Mgmt Plane Foundational - IAM, Security, Governance](./MPLANE-FOUNDATIONAL.md)
2. **Mgmt Plane Networking 1st stage - Mgmt Plane VCNs and DRG (this stack)**
3. [Mgmt Plane Networking - Firewall](./MPLANE-FIREWALL.md)
4. **Mgmt Plane Networking 2nd stage - Network routing post firewall deployment (this stack)**
5. Either [Pod Model - Customer Onboarding](./POD-CUSTOMER-ONBOARDING.md) or [Multi-Tenant Shared](./MT-SHARED-OKE.md)/[Mgmt Plane Tooling](./MPLANE-TOOLING.md)/[Multi-Tenant Model - Customer Onboarding](./MT-CUSTOMER-ONBOARDING.md)

### <a name="stage1">Network Stack 1st Stage</a> 

#### Stack Configuration

Input Configuration Files | Input Dependency Files | Generated Output
--------------------------|------------------------|------------------
[network_initial_config.json](../mgmt-plane/network/network_initial_config.json)* <br> [flow_logs_config.json](../mgmt-plane/network/flow_logs_config.json)  <br> [jump_host_config.json](../mgmt-plane/network/jump_host_config.json)* | mgmt-plane/iam/output/compartments_output.json | mgmt-plane/network/output/network_output.json

\* Make sure to assign your SSH public key to *default_ssh_public_key_path* attribute in *network_initial_config.json*.

#### Stack Creation

**Deploying this stack as-is requires [Deployment Bootstrap](../readme.md#deployment-bootstrap)**.

[![Deploy_To_OCI](../../design/images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.10.zipp&zipUrlVariables={"configuration_source":"ocibucket","oci_configuration_bucket":"landing-zone-runtime-bucket","oci_configuration_objects":"mgmt-plane/network/network_initial_config.json,mgmt-plane/network/flow_logs_config.json,mgmt-plane/network/jump_host_config.json","oci_dependency_objects":"mgmt-plane/iam/output/compartments_output.json","save_output":true,"oci_object_prefix":"mgmt-plane/network/output"})

In the Resource Manager Service (RMS) **Create stack - Stack Information** screen that shows up, check the *I have reviewed and accept the Oracle Terms of Use* box, make sure to select *terraform-oci-modules-orchestrator-main/rms-facade* in the **Working directory** drop down, as shown in the image below. 

![Working_directory](../../design/images/orchestrator-working-dir.png)

Give the stack a meaningful name in the *Name* field (*isv-networking*, for instance), and follow the RMS workflow to complete the stack creation. 

The **Create stack - Configure variables** screen shows the variables pre-filled.

In the final **Create stack - Review** screen, make sure to uncheck the *Run Apply* button, so you have a chance to inspect the Terraform plan output.

![Run_Apply_Disabled](../../design/images/orchestrator-run-apply-disabled.png)

Within the stack, perform a *Plan*, inspect its output, and finally run an *Apply* to actually deploy the resources.

#### What Gets Deployed

The resources in red color are added.

![isv-pod-architecture-mgmt-plane-network-initial](../../design/images/mgmt-plane-network-initial.png)


### <a name="stage2">Network Stack 2nd Stage</a>

**THE 2ND STAGE IS NOT A NEW STACK, BUT AN UPDATE TO NETWORK STACK INITIAL DEPLOYMENT, NOW INCLUDING THE CONFIGURATIONS DEPLOYED BY THE NETWORK FIREWALL STACK.**

**AFTER THIS STAGE THE MANAGEMENT PLANE IS CONSIDERED READY TO ONBOARD CUSTOMERS.**

This stage updates the initial network configuration with route rules to the Network Load Balancers deployed by the [Mgmt Plane Networking - Firewall](./MPLANE-FIREWALL.md) stack. 

Specifically:

**THESE CONFIGURATION SNIPPETS ARE SHOWN HERE FOR CLARITY PURPOSES. THEY ARE ALL ALREADY ADDED IN [network_post_firewall_config.json](../mgmt-plane/network/network_post_firewall_config.json).**

1. An ingress route table **IS ADDED** for routing traffic to Central Hub VCN's Service Gateway and to the Indoor Network Load Balancer.
```
...
"HUB-INGRESS-ROUTE" : {
    "display_name" : "central-hub-vcn-ingress-route-table",
    "route_rules" : {
        "TO-OSN-RULE" : {
            "description"        : "Traffic destined to Oracle Services Network goes to Service Gateway.",
            "destination"        : "all-services",
            "destination_type"   : "SERVICE_CIDR_BLOCK",
            "network_entity_key" : "CENTRAL-HUB-VCN-SGW"
        },
        "TO-ANYWHERE-RULE" : {
            "description"        : "All remaining traffic goes to Indoor NLB.",
            "destination"        : "0.0.0.0/0",
            "destination_type"   : "CIDR_BLOCK",
            "network_entity_key" : "INDOOR-NLB"
        }
    }
}
...
```  
This route table is associated as the ingress route table to *central-hub-vcn-attachment* DRG attachment. 
```
...
"CENTRAL-HUB-VCN-ATTACH" : {
    "display_name" : "central-hub-vcn-attachment",
    "drg_route_table_key" : "HUB-VCN-DRG-ROUTE",
    "network_details" : {
        "attached_resource_key" : "CENTRAL-HUB-VCN",
        "type" : "VCN",
        "route_table_key" : "HUB-INGRESS-ROUTE"
    }
}
...   
``` 
The effect is directing traffic entering the DRG through this attachment to either the Service Gateway or to the Indoor Network Load Balancer (that further routes traffic to the firewall Indoor interfaces).   

2. (Not shown in diagram) A route rule is added to the LBR subnet route table, directing all traffic destined to the customer VCNs (here's represented by the overarching CIDR block 10.0.0.0/16) to the Outdoor Network Load Balancer.
```
...
"LBR-SUB-ROUTE" : {
    "display_name" : "lbr-subnet-route-table",
    "route_rules" : {
        "OUTDOOR-NLB-RULE" : {
            "network_entity_key" : "OUTDOOR-NLB",
            "description"        : "Traffic destined to customer VCNs goes to Outdoor NLB.",
            "destination"        : "10.0.0.0/16",
            "destination_type"   : "CIDR_BLOCK"
        },
        ...
    }
}
...              
```

#### Updated Stack Configuration

In order to update the initial network configuration, edit the existing network stack, replacing the existing Input Configuration Files and Input Dependency Files with the files in the table below:

Input Configuration Files | Input Dependency Files | Generated Output
--------------------------|------------------------|------------------
[network_post_firewall_config.json](../mgmt-plane/network/network_post_firewall_config.json)* (**must be added, replacing *network_initial_config.json***) <br> [flow_logs_config.json](../mgmt-plane/network/flow_logs_config.json) (unchanged) <br> [jump_host_config.json](../mgmt-plane/network/jump_host_config.json) (unchanged) | mgmt-plane/iam/output/compartments_output.json (unchanged) <br> mgmt-plane/firewall/output/nlbs_output.json (**must be added. It brings in the references to NLB OCIDs**)  | mgmt-plane/network/output/network_output.json

\* Make sure to assign your SSH public key to *default_ssh_public_key_path* attribute in *network_post_firewall_config.json*.

#### What Gets Deployed

The resources in red color are added.

![isv-pod-architecture-mgmt-plane-network-post-firewall](../../design/images/mgmt-plane-network-post-firewall.png)
