# OCI Open LZ - [Hub A](#)
## A Hub with Two OCI Network Firewalls

&nbsp; 

**Table of Contents**

[1. Overview](#1-overview)</br>
[2. Components](#2-components)</br>
[3. Specifications and Considerations](#3-specifications-and-considerations)</br>
[4. Routing](#4-routing)</br>
[5. Deploy](#5-deploy)</br>

&nbsp;

### 1. Overview
**Hub A** is equipped with two OCI Network Firewalls - a next-generation managed network firewall and an intrusion detection and prevention service. 
The first firewall is dedicated to inbound traffic, while the second is responsible for outbound and East-West traffic control and inspection.


<img src="images/hub_a_design.png" width="250" height="value">

### 2. Components
- VCN (Virtual Cloud Network)
- Two regional public subnets (depicted in green)
    1. public-subnet for DMZ/external OCI Network Firewall (note: even though **DMZ-FW** is in a public subnet, it hasn't public interface, it has only single private interface with private IP address)
    2. public-subnet for Public Load Balancers
- Four regional private subnets (depicted in dark-orange)
    1. private-subnet for Internal OCI Network Firewall
    2. private-subnet for management workloads
    3. private-subnet for monitoring and logs
    4. private-subnet for DNS (for OCI DNS resolver endpoints)
- Internet Gateway
- NAT Gateway
- Service Gateway
- **DMZ-FW** - first OCI Network Firewall: responsible for Inbound network traffic control and inspection.
- **Internal-FW** - second OCI Network Firewall: responsible for Outbound and East-West network traffic control and inspection.
- Public Load Balancer (LBaaS)

&nbsp;

### 3. Specifications and Considerations
- Segmentation of network traffic and increased throughput: ensures efficient traffic management and higher data transfer rates.
- Visibility into Inbound traffic source on **DMZ-FW**: enables detailed control over traffic entering the Hub VCN.
- SSL Decryption Policy configuration on **DMZ-FW** to allow inspect SSL traffic before sending it to the Public Load Balancer.
- Higher cost compared to the **[Hub B](/addons/oci-hub-models/hub_b/readme.md)** model: 2 x price of the OCI Network Firewall.
<br>

&nbsp;

### 4. Routing

The following diagram presents a Hub & Spoke architecture diagram with corresponding routing tables and routing rules.

<img src="images/hub_a_routing.png" width="900" height="value">

&nbsp;

#### Legend:

<img src="images/oci_hub_models_legend.png" width="200" height="value">

&nbsp;

For a comprehensive understanding of how network packets flow within **Hub A** and Spoke VCNs refer to the [Network packet flow animation - Hub A](/addons/oci-hub-models/hub_a/hub-a-packet_flow.md).

&nbsp;

> [!NOTE]
> *The CIDR ranges shown in the architecture diagram are for illustrative purposes only and should be adjusted to align with each specific use case.*

&nbsp;

### 5. Deploy

Follow the deployment sheet below to have Hub A deployed in your tenancy with IaC declarations.

| | |
|---|---|
| **OPERATION** | **Hub A Deployment** | 
| **TARGET RESOURCES**  </br></br><img src="../../../commons/images/icon_oci.jpg" width="32"> | </br>This operation creates all the resources described in [Section 2](#2-components). </br>**Note: This stack deploys OCI Network Firewalls, which will incur OCI service costs.**</br></br> 
| **INPUT CONFIGURATIONS** </br></br><img src="../../../commons/images/icon_json.jpg" width="30" align="center">&nbsp; +&nbsp; <img src="../../../commons/images/icon_terraform.jpg" width="32" align="center">|</br>[**IAM Configuration**](addon_iam.json) as input to the [OCI Landing Zone IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) module. </br>[**Network Configuration**](addon_network_hub_a_pre.json) as input to the [OCI Landing Zone Network](https://github.com/oci-landing-zones/terraform-oci-modules-networking) module.</br></br> |
| **DEPLOY WITH ORM** </br>*- STEP #1* </br></br><img src="../../../commons/images/icon_orm.jpg" width="40">| </br>[<img src="/commons/images/DeployToOCI.svg"  height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.5.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-hub-models/hub_a/addon_iam.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-hub-models/hub_a/addon_network_hub_a_pre.json"})  </br></br> And follow these steps:</br> **a**. Accept terms,  wait for the configuration to load. </br> **b**. Set the working directory to “rms-facade”. </br> **c**. Set the stack name you prefer.</br> **d**. Set the terraform version to 1.5.x. Click Next. </br> **e**. Accept the default files. Click Next. Optionally, replace with your json/yaml config files. </br> **f**. Un-check run apply. Click Create. </br> </br> |
| **POST DEPLOYMENT** </br>*- STEP #2* </br></br><img src="../../../commons/images/icon_orm.jpg" width="40"> | </br>This step focuses on **updating the routing** after the DMZ and Internal Firewalls have been provisioned:<br><br> **a**. Identify the Private IP OCID of your firewalls as described [here](../../../commons/content/howto_identify_private_ip_ocid_network_firewall.md). </br></br> **b**. Update the network JSON configuration [addon_network_hub_a.json](addon_network_hub_a.json) and replace the *"DMZ OCI NFW PRIVATE IP OCID"* with the OCID of the Public DMZ Firewall Private IP identified in the previous steps. You can use the find & replace of the IDE of your choice. </br></br> **c**. Update the network JSON configuration and replace the *"Internal OCI NFW PRIVATE IP OCID"* with the OCID of the Private Internal Firewall Private IP identified in the previous steps. </br></br> **d**. Edit the ORM stack and replace the [addon_network_hub_a_pre.json](addon_network_hub_a_pre.json) configuration file with the updated [addon_network_hub_a.json](addon_network_hub_a.json). </br></br> **e**. Run Plan & Apply. </br> </br> |





&nbsp; 

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
