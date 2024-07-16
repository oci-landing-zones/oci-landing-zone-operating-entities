# OCI Open LZ - [Hub B](#)
## Hub with One OCI Network Firewall

&nbsp; 

### Overview
**Hub B** features a single OCI Network Firewall, a next-generation managed network firewall and an intrusion detection and prevention service. This firewall handles Inbound, Outbound, and East-West traffic control and inspection, ensuring comprehensive network security and monitoring across all traffic flows.


&nbsp; 

<img src="images/hub_b_design.png" width="250" height="value">

#### The main components of a **Hub B**:
- VCN (Virtual Cloud Network)
- One regional public subnet (depicted in green)
    1. public-subnet for Public Load Balancers
- Four regional private subnets (depicted in dark-orange)
    1. private-subnet for OCI Network Firewall
    2. private-subnet for managment workloads
    3. private-subnet for logs
    4. private-subnet for DNS (for OCI DNS resolver endpoints)
- Internet Gateway
- NAT Gateway
- Service Gateway
- Public Load Balancer (LBaaS)
- **OCI-FW** - OCI Network Firewall: responsible for Inbound/Outbound (North-South) and East-West network traffic control and inspection.


#### Specifications and considerations:
- Single Firewall: handles North-South (Inbound/Outbound) and East-West traffic inspection.
- Throughput rate: specifies the capacity of a single OCI Network Firewall.
- Visibility limitations: no visibility into the source of Inbound traffic, as the OCI Network Firewall only sees traffic coming from the Public Load Balancer.
- Cost Efficiency: lower cost compared to the **[Hub A](/addons/oci-hub-models/hub_a/readme.md)** model.
<br>

#### Hub & Spoke architecture diagram with corresponding routing tables and routing rules:

<img src="images/hub_b_routing.png" width="900" height="value">

&nbsp;

#### Legend:
<img src="images/oci_hub_models_legend.png" width="200" height="value">

&nbsp;

Note: The CIDR ranges shown in the architecture diagram are for illustrative purposes only and should be adjusted to align with each specific use case.

For comprehensive understanding of how network packets flow within **Hub B** and Spoke VCNs refer to the [Network packet flow animation - Hub B](/addons/oci-hub-models/hub_b/hub-b-packet_flow.md).

&nbsp;

| |  |
|---|---| 
| **ID** | Hub B | 
| **DESCRIPTION** | Hub with One OCI Network Firewall | 
| **DETAILED DESCRIPTION** | View [Network Packet Flow](/addons/oci-hub-models/hub_b/hub-b-packet_flow.md) |
| **OCI RESOURCES SCOPE** | ? |
| **IAC CONFIGURATION** | [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) |
| **DEPLOY WITH ORM** | TBU |


&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
