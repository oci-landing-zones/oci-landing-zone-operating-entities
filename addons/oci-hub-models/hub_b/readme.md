# OCI Open LZ - [Hub B](#)
## The OCI Native FW Hub - 1 Firewall

&nbsp; 

### Overview
TO BE COMPLETED - ADD A TABLE WITH CHARACTERISTICS

&nbsp; 


| |  |
|---|---| 
| **ID** | MODEL B| 
| **DESCRIPTION** | 
| **DETAILED DESCRIPTION** | View [Network Packet Flow](/addons/oci-hub-models/hub_a/hub-a-packet_flow.md)|
| **OCI RESOURCES SCOPE** | |
| **IAC CONFIGURATION** | [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) |
| **DEPLOY WITH ORM** | |

###  **[Hub B:](#)**

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
- Low cost compared to the **[Hub Model A](/addons/oci-hub-models/hub_a/readme.md)**
<br>

#### Hub & Spoke architecture diagram with corresponding routing tables and routing rules:

<img src="images/hub_b_routing.png" width="900" height="value">