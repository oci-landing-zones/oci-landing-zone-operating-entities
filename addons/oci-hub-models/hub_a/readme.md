# OCI Open LZ - [Hub A](#)
## The OCI Native FW Hub - 2 Firewalls

&nbsp; 

### Overview
TO BE COMPLETED - ADD A TABLE WITH CHARACTERISTICS

&nbsp; 


| |  |
|---|---| 
| **ID** | MODEL A | 
| **DESCRIPTION** | 
| **DETAILED DESCRIPTION** | View [Network Packet Flow](/addons/oci-hub-models/hub_a/hub-a-packet_flow.md)|
| **OCI RESOURCES SCOPE** | |
| **IAC CONFIGURATION** | [oci_open_lz_one-oe_network.auto.tfvars.json](oci_open_lz_one-oe_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) |
| **DEPLOY WITH ORM** | |

### **[Hub A](#)**

<img src="images/hub_a_design.png" width="250" height="value">

#### The main components of a **Hub A**:
- VCN (Virtual Cloud Network)
- Two Public subnets (depicted in green)
- Four Private subnets (depicted in dark-orange)
- Internet Gateway
- NAT Gateway
- Service Gateway
- **DMZ-FW** - first OCI Network Firewall: responsible for Inbound network traffic control and inspection.
- **Internal-FW** - second OCI Network Firewall: responsible for Outbound and East-West network traffic control and inspection.
- Public Load Balancer (LBaaS)

#### Specifications and considerations:
- Segmentation of the network traffic and higher throughput rate.
- Visibility into the source of the inbound traffic on the **DMZ-FW**.
- SSL Decryption Policy configuration on **DMZ-FW** to allow inspect SSL traffic before sending it to the Public Load Balancer.
- Higher cost compared to the **[Hub Model B](/addons/oci-hub-models/hub_b/readme.md)**: 2 x price of the OCI Network Firewall.
<br>

#### Hub & Spoke architecture diagram with corresponding routing tables and routing rules:

<img src="images/hub_a_routing.png" width="900" height="value">


Note: the CIDR ranges presented in the architecture diagram are for documentation purposes only, and should be aligned for each specific use case.

For comprehensive understanding of how network packets flow within Hub Model A and Spoke VCNs refer to the [Network packet flow animation - Hub Model A](/hub-a-packet_flow.md).