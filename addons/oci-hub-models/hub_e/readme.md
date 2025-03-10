# OCI Open LZ - [Hub E](#)
## A Hub without Network Firewalls

&nbsp; 

**Table of Contents**

[1. Overview](#1-overview)</br>
[2. Components](#2-components)</br>
[3. Specifications and Considerations](#3-specifications-and-considerations)</br>
[4. Routing](#4-routing)</br>

&nbsp;

### 1. Overview
**Hub E** model is designed without a Network Firewall while ensuring that all incoming traffic is routed through the DMZ/Public Load Balancer public subnet. This approach allows the central network team to maintain control over traffic flow and enforce security using Security Lists, NSGs, and WAF (for HTTP/S traffic), while also managing and controlling East-West traffic communication between Spoke VCNs through DRG route tables.
It is recommended for environments where deep packet inspection is not a security requirement, as well as for proof-of-concept (PoC) deployments and Hub & Spoke architecture exploration.

<img src="images/hub_e_design.png" width="250" height="value">

### 2. Components
- VCN (Virtual Cloud Network)
- One regional public subnet (depicted in green)
    1. public-subnet for Public Load Balancers
- Three regional private subnets (depicted in dark-orange)
    1. private-subnet for management workloads
    2. private-subnet for monitoring and logs
    3. private-subnet for DNS (for OCI DNS resolver endpoints)
- Internet Gateway
- NAT Gateway
- Service Gateway
- Public Load Balancer (LBaaS)

&nbsp;

### 3. Specifications and Considerations
- Inbound traffic first enters the Public Load Balancer's public subnet and is then routed through the DRG to the respective LB's backends in the Spoke VCNs.
- Each Spoke VCN has its own NAT Gateway for outbound traffic.
- East-West traffic between Spoke VCNs is routed through the DRG.

&nbsp;

### 4. Routing

The following diagram presents a Hub & Spoke architecture diagram with corresponding routing tables and routing rules.

<img src="images/hub_e_routing.png" width="900" height="value">

&nbsp;

#### Legend:

<img src="images/oci_hub_models_legend.png" width="200" height="value">

&nbsp;

> [!NOTE]
> *The CIDR ranges shown in the architecture diagram are for illustrative purposes only and should be adjusted to align with each specific use case.*

&nbsp;
