# OCI Open LZ - [Hub A](#)
## Hub with Two OCI Network Firewalls

&nbsp; 

### Overview
**Hub A** is equipped with two OCI Network Firewalls - a next-generation managed network firewall and an intrusion detection and prevention service. 
The first firewall is dedicated to inbound traffic, while the second is responsible for outbound and East-West traffic control and inspection.


<img src="images/hub_a_design.png" width="250" height="value">

#### The main components of a **Hub A**:
- VCN (Virtual Cloud Network)
- Two regional public subnets (depicted in green)
    1. public-subnet for DMZ/external OCI Network Firewall (note: even though **DMZ-FW** is in a public subnet, it hasn't public interface, it has only single private interface with private IP address)
    2. public-subnet for Public Load Balancers
- Four regional private subnets (depicted in dark-orange)
    1. private-subnet for Internal OCI Network Firewall
    2. private-subnet for managment workloads
    3. private-subnet for logs
    4. private-subnet for DNS (for OCI DNS resolver endpoints)
- Internet Gateway
- NAT Gateway
- Service Gateway
- **DMZ-FW** - first OCI Network Firewall: responsible for Inbound network traffic control and inspection.
- **Internal-FW** - second OCI Network Firewall: responsible for Outbound and East-West network traffic control and inspection.
- Public Load Balancer (LBaaS)

#### Specifications and considerations:
- Segmentation of network traffic and increased throughput: ensures efficient traffic management and higher data transfer rates.
- Visibility into Inbound traffic source on **DMZ-FW**: enables detailed control over traffic entering the Hub VCN.
- SSL Decryption Policy configuration on **DMZ-FW** to allow inspect SSL traffic before sending it to the Public Load Balancer.
- Higher cost compared to the **[Hub B](/addons/oci-hub-models/hub_b/readme.md)** model: 2 x price of the OCI Network Firewall.
<br>

#### Hub & Spoke architecture diagram with corresponding routing tables and routing rules:

<img src="images/hub_a_routing.png" width="900" height="value">

&nbsp;

 #### Legend:
<img src="images/oci_hub_models_legend.png" width="200" height="value">

&nbsp;

Note: The CIDR ranges shown in the architecture diagram are for illustrative purposes only and should be adjusted to align with each specific use case.

For comprehensive understanding of how network packets flow within **Hub A** and Spoke VCNs refer to the [Network packet flow animation - Hub A](/addons/oci-hub-models/hub_a/hub-a-packet_flow.md).

&nbsp;

| |  |
|---|---| 
| **ID** | Hub A | 
| **DESCRIPTION** | Hub with Two OCI Network Firewalls |
| **DETAILED DESCRIPTION** | View [Network Packet Flow](/addons/oci-hub-models/hub_a/hub-a-packet_flow.md)|
| **OCI RESOURCES SCOPE** | ? |
| **IAC CONFIGURATION** | [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) |
| **DEPLOY WITH ORM** | TBU |


&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
