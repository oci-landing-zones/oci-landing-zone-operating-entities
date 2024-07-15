# OCI Open LZ - [Hub B](#)
## Hub with One OCI Network Firewall

&nbsp; 

### Overview
**Hub B** consist of one OCI Network Firewalls (next-generation managed network firewall and intrusion detection and prevention service) for inbound, outbound, as well as for inter spoke and on-prem traffic control and inspection.

&nbsp; 

<img src="images/hub_b_design.png" width="250" height="value">

#### The main components of a **Hub B**:
- VCN (Virtual Cloud Network)
- One Public subnet (depicted in green)
- Four Private subnets (depicted in dark-orange)
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

Note: the CIDR ranges presented in the architecture diagram are for documentation purposes only, and should be aligned for each specific use case.

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