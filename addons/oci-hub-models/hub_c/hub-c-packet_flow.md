# OCI Open LZ - [Hub C Packet Flow](#)

&nbsp; 

### Overview
The purpose of this document is to illustrate, through explanatory animations, the journey of a request packet (shown as a red rectangle) and a response packet (shown as a blue rectangle), along with the corresponding routing rules in each routing table (RT), for Inbound-Outbound (North-South) and East-West network traffic, within a **Hub C** and Spoke VCNs.

&nbsp; 

### Hub configuration details
The setup includes two private Network Load Balancers operating in transparent mode with symmetric hashing enabled, two third-party network firewalls ensuring high availability (HA), and a public Load Balancer (LBaaS).

&nbsp;

#### **Network Load Balancer: NLB-Untrust**
   - Type: *Private*
   - Mode: *Source and destination IP header preservation (transparent)*
   - Symmetric hashing: *Enabled*
   - Placement: *Public Untrust subnet*
   - Backends: *The first vNICs of Firewall 1 and Firewall 2*
 
#### **Network Load Balancer: NLB-Trust**
   - Type: *Private*
   - Mode: *Source and destination IP header preservation (transparent)*
   - Symmetric hashing: *Enabled*
   - Placement: *Private Trust subnet*
   - Backends: *The second vNICs of Firewall 1 and Firewall 2*

&nbsp;

#### **Third-Party Network Firewall configuration**
In this architecture, each firewall appliance has two virtual network interfaces: one in the Trust (private) subnet and the second one in the Untrust (public) subnet (depending on the third-party firewall vendor, additional interfaces may be presented, such as a management network interface). The interface in the public subnet is associated with a public IP address. The firewalls perform NAT for outbound traffic, allowing the Spoke VMs to reach the internet via the public interfaces (vNIC1) of either Firewall 1 or Firewall 2.

The firewalls have been configured with the following static route rules:

| Network | Description | Gateway | Description | Interface |
| --- | --- | --- | --- | --- |
| 0.0.0.0/0 | To the Internet   | 10.0.0.1 | Default Gateway of Untrust subnet | vNIC 1 |
| 10.0.2.0/24 | CIDR of LBaaS subnet | 10.0.0.1 | Default Gateway of Untrust subnet | vNIC 1 |
| 192.168.10.0/24 | CIDR of VCN Spoke A | 10.0.1.1 | Default Gateway of Trust subnet | vNIC 2 |
| 192.168.20.0/24 | CIDR of VCN Spoke B | 10.0.1.1 | Default Gateway of Trust subnet | vNIC 2 |

*Table 1: 3rd Party Firewall Route Table*

&nbsp;

#### **Load Balancer (LBaaS)**
To serve different web applications the public Load Balancer leverages the routing policy, which has the following configuration:
- if a.example.com, then route to backend VM-A
- if b.example.com, then route to backend VM-B

&nbsp;

### Symmetric Hashing feature

The OCI Network Load Balancer leverages symmetric hashing to ensure consistent handling of packets belonging to the same flow in both forward and return directions. Here's how symmetric hashing benefits the configuration:
- Hash Calculation: Symmetric hashing calculates the same hash for packets in both forward and return directions. This means the hash remains unchanged when the source IP address:port value is exchanged with the destination IP address:port value.
- Traffic Inspection: By enabling symmetric hashing, both forward and return traffic can be inspected by the same firewall appliance. This firewall appliance is hosted as a backend on the OCI Network Load Balancer, functioning in a [bump-in-the-wire](https://en.wikipedia.org/wiki/Bump-in-the-wire) fashion.
- Simplified Firewall Configuration: Symmetric hashing eliminates the need for complex configurations on the firewall appliances, such as source NAT. This helps prevent asymmetric routing issues, ensuring a more streamlined and efficient setup.

Enabling symmetric hashing allows for better traffic management and inspection, scaling of network firewall appliances, and reducing the complexity of firewall configurations while maintaining efficient and reliable network routing.

For more information on [OCI Network Load Balancer and Symmetric hashing](https://docs.oracle.com/en-us/iaas/Content/NetworkLoadBalancer/NetworkLoadBalancers/preserve-source-id.htm).

&nbsp;

### 1. Inbound Packet Flow
- Source: Internet
- Destination: 192.168.10.10 

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/oci-hub-models/hub_c/hub_c_inbound.gif" width="600" />

A user from the Internet attempts to access *a.example.com*, which is hosted on **VM-A** behind a Public Load Balancer. Upon DNS resolution, the user's request targets the Load Balancer's public IP address. The packet then enters the Hub VCN via Internet Gateway, which has an associated VCN route table **RT: vcn-hub-igw** (Gateway Ingress Routing). The route rule defined in this VCN route table forces the packet to go through a private IP address of the **NLB-Untrust** network load balancer. **NLB-Untrust** selects one of the backend Firewalls and uses symmetric hashing to calculate the same hash for packets in both, forward and return directions. After control and inspection, the firewall routes the packet via vNIC1 to the public Load Balancer, based on its internal static routes ([*Table 1*](#Third-Party-Network-Firewall-configuration)) and VCN implicit local route. The Load Balancer then attempts to forward the packet to the appropriate backend VM, in this case to **VM-A**, based on its routing policy rules.

&nbsp; 

### 2. Outbound Packet Flow
- Source: 192.168.10.10
- Destination: Internet
  
<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/oci-hub-models/hub_c/hub_c_outbound.gif" width="600" />

**VM-A** initiates a communication to the Internet. The packet traverses through the Dynamic Routing Gateway (DRG) and is forced by the VCN route table - **RT: vcn-hub-ingress** to choose as the next-hop **NLB-Trust**. Then it selects one of the backend firewalls and uses symmetric hashing to calculate the same hash for packets in both, forward and return directions. After inspection, firewall does a NAT and routes the packet via vNIC1 to the Internet Gateway, based on its internal static routes ([*Table 1*](#Third-Party-Network-Firewall-configuration)) and VCN route table - **RT: vcn-hub-subnet-untrust**.

&nbsp; 

### 3. East-West Packet Flow
- Source: 192.168.10.10
- Destination: 192.168.20.20 

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/oci-hub-models/hub_c/hub_c_east_west.gif" width="600" />

**VM-A** initiates a communication with **VM-B**. The packet goes through the Dynamic Routing Gateway (DRG) and is forced by the VCN route table - **RT: vcn-hub-ingress** to choose as the next-hop **NLB-Trust**. Then it selects one of the backend firewalls and uses symmetric hashing to calculate the same hash for packets in both, forward and return directions. The firewall inspects the packet and routes it back to the DRG, based on its internal static routes ([*Table 1*](#Third-Party-Network-Firewall-configuration)) and VCN route table - **RT: vcn-hub-subnet-trust**, which is associated with **subnet-hub-trust** subnet. The response packet follows a similar flow to get back to the **VM-A**.

&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
