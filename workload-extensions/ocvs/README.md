# **[OCVS Landing Zone Extension](#)** <!-- omit from toc -->
## **An OCI Open LZ [Workload Extension](#) to Reduce Your Time-to-Production** <!-- omit from toc -->

<img src="../../commons/images/icon_ocvs.jpg" height="100">

&nbsp;

- [**1. Introduction**](#1-introduction)
- [**2. Design Overview**](#2-design-overview)
- [**3. Setup IAM Configuration**](#3-setup-iam-configuration)
  - [**3.1 Compartments**](#31-compartments)
  - [**3.2 Groups**](#32-groups)
  - [**3.3 Policies**](#33-policies)
- [**4. Setup Network Configuration**](#4-setup-network-configuration)
- [**5. Deployment**](#5-deployment)

## **1. Introduction**
Welcome to the **OCVS Landing Zone Extension**.

The OCVS Landing Zone (LZ) Extension is a secure cloud environment, designed with best practices to simplify the onboarding of OCVS workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone **configuration**.


[<img src="../../commons/images/DeployToOCI.svg" alt="Deploy_To_OCI" height="30">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.3.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_governance.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_identity.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_network.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_security_cis1_pre.json"})

&nbsp;

## **2. Design Overview**

This workload extension uses the [One-OE](/blueprints/one-oe) Blueprint as the reference Landing Zone and guides the deployment of OCVS on top of it.


<img src="./content/network.png" width="1000" height="auto">

&nbsp;

## **3. Setup IAM Configuration**

The [OCVS identity configuration](./ocvs_identity.json) is a generated snapshot that contains the complete One-OE identity configuration and the OCVS-specific IAM additions described below.

&nbsp; 

###  **3.1 Compartments**

The diagram below identifies the compartments in the scope of this operation.

<img src="./content/compartments.png" width="1000" height="auto">

&nbsp; 

The OCVS extension adds the `cmp-lz-prod-ocvs` platform compartment beneath the production platform compartment.

One-OE Landing Zones defines multiple instances of platform compartments. A platform compartment is created **for each environment**, and **one shared** platform is created for resources spanning multiple environments.

Using this extension requires choosing the right platform for the use cases. The extension can be modified to provision multiple instances of the deployment. For customizations see the full [compartment resource documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/compartments).

&nbsp; 

### **3.2 Groups**
As part of the deployment the following groups are created in the [Default Identity Domain](https://docs.oracle.com/en-us/iaas/Content/Identity/domains/overview.htm):
| Group                      | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| grp-lz-prod-ocvs-admins | Members of the group can administer the OCVS platform and SDDC resources. |

For customizations see the full [group resource documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/groups)

&nbsp; 

### **3.3 Policies**
As part of the deployment the following policies are created:
| Policy                     | Description                                             | Manage resources             | Use resources                   | Inspect resources |
| -------------------------- | ------------------------------------------------------- | ---------------------------- | ------------------------------- | ----------------- |
| pcy-lz-prod-ocvs-admins | Grants `grp-lz-prod-ocvs-admins` OCVS platform administration permissions. | SDDCs, Compute instances | NSGs, Subnets, VNICs, Private IPs, VLANs | Virtual network family |

Policies contain compartment paths. The paths can change based on the modification in the previous [Compartments](#31-compartments) section. The paths need to be updated following the OCI [Policies and Compartment hierarchy](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policies.htm#hierarchy).

For customizations see the full [policy resource documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/policies)

&nbsp; 

## **4. Setup Network Configuration**

The [OCVS network configuration](./ocvs_network.json) is a generated snapshot that contains the complete One-OE network configuration and the OCVS-specific network additions described below.

This configuration covers the following networking diagram.

&nbsp; 

<img src="./content/network.png" width="1000" height="auto">

&nbsp; 

For customization of the pre-defined setup please refer to the [Networking documentation](https://github.com/oci-landing-zones/terraform-oci-modules-networking) for documentation and examples.

The OCVS-specific network additions are:

1. An OCVS platform VCN and provisioning subnet.
2. A Service Gateway and provisioning security list.
3. Route tables and network security groups for the provisioning and SDDC VLAN networks.
4. A DRG attachment that connects the OCVS VCN to the central DRG.


&nbsp; 


## **5. Deployment**

The OCVS workload extension provides one-click deployment that combines One-OE, Hub E, and OCVS.


[<img src="../../commons/images/DeployToOCI.svg" alt="Deploy_To_OCI" height="30">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.3.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_governance.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_identity.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_network.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/workload-extensions/ocvs/ocvs_security_cis1_pre.json"})

Use the link above to deploy using [Oracle Resource Manager (ORM)](/commons/content/orm.md) or use [Terraform CLI](/commons/content/terraform.md)


&nbsp;

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
