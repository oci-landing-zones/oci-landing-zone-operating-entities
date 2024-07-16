# OCI Open LZ - [Hub B](#)
## Hub with One OCI Network Firewall

&nbsp; 

### Overview
**Hub B** consist of one OCI Network Firewalls (next-generation managed network firewall and intrusion detection and prevention service) for inbound, outbound, as well as for inter spoke and on-prem traffic control and inspection.

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
    4. private-subnet for DNS (OCI Forwarders, Listeners)
- Internet Gateway
- NAT Gateway
- Service Gateway
- Public Load Balancer (LBaaS)
- **OCI-FW** - OCI Network Firewall: responsible for Inbound/Outbound (North-South) and East-West network traffic control and inspection.


#### Specifications and considerations:
- Single Firewall for North-South (Inbound/Outbound) and East-West traffic inspection.
- Throughput rate of a single OCI Network Firewall.
- No visibility into the source of the Inbound traffic, as the source is Public Load Balancer.
- Low cost compared to the **[Hub A](/addons/oci-hub-models/hub_a/readme.md)** model.
<br>

#### Hub & Spoke architecture diagram with corresponding routing tables and routing rules:

<img src="images/hub_b_routing.png" width="900" height="value">

&nbsp;

#### Legend:
<img src="images/oci_hub_models_legend.png" width="200" height="value">

&nbsp;

Note: the CIDR ranges presented in the architecture diagram are for documentation purposes only, and should be aligned for each specific use case.

For comprehensive understanding of how network packets flow within **Hub B** and Spoke VCNs refer to the [Network packet flow animation - Hub B](/addons/oci-hub-models/hub_b/hub-b-packet_flow.md).

&nbsp;

| |  |
|---|---| 
| **ID** | Hub B | 
| **DESCRIPTION** | 
| **DETAILED DESCRIPTION** | TBU |
| **OCI RESOURCES SCOPE** | |
| **IAC CONFIGURATION** | [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) |
| **DEPLOY WITH ORM** | |


&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
