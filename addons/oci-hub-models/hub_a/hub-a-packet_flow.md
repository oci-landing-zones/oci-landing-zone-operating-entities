# OCI Open LZ - [Hub A Packet Flow](#)

&nbsp; 

### Overview
The purpose of this document is to illustrate, through explanatory animations, the journey of a request packet (shown as a red rectangle) and a response packet (shown as a blue rectangle), along with the corresponding routing rules in each routing table (RT), for Inbound-Outbound (North-South) and East-West network traffic, within a **Hub A** and Spoke VCNs.

&nbsp; 

### 1. Inbound Packet Flow
- Source: Internet
- Destination: 192.168.10.10 

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/oci-hub-models/hub_a/hub_a_inbound.gif" width="600" />

A user on the Internet attempting to access *a.example.com*, which is hosted on **VM-A**, located behind a Public Load Balancer. After DNS resolution, the user's request targets the Load Balancer's public IP address. The packet then enters the Hub VCN via Internet Gateway, which has an associated VCN route table **RT: vcn-hub-igw** (Gateway Ingress Routing). The route rule defined in this VCN route table forces the packet to go through a private IP address of the **NFW-hub-dmz** (OCI Network Firewall). After inspection, the **NFW-hub-dmz** uses the VCN implicit local route to forward the packet to the Load Balancer's private IP. A Load Balancer then forwards the packet to the appropriate backend VM, based on its policy rules.

&nbsp; 

### 2. Outbound Packet Flow
- Source: 192.168.10.10
- Destination: Internet
  
<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/oci-hub-models/hub_a/hub_a_outbound.gif" width="600" />

**VM-A** initiates a communication to the Internet. The packet traverses through the Dynamic Routing Gateway (DRG) and is forced by the VCN route table: **vcn-hub-ingress** to pass through a **NFW-hub-int**. After inspection, the **NFW-hub-int** uses **RT: vcn-hub-subnet-int** to route the packet to the NAT Gateway. The response packet from the Internet is then forced by the route rule in the **RT: vcn-hub-natgw** (a route table associated with a NAT gateway) to pass through the private IP address of the **NFW-hub-int** for inspection, and then through the DRG back to **VM-A**.

&nbsp; 

### 3. East-West Packet Flow
- Source: 192.168.10.10
- Destination: 192.168.20.20 

<img src="https://github.com/oracle-quickstart/terraform-oci-open-lz/blob/content/oci-hub-models/hub_a/hub_a_east_west.gif" width="600" />

**VM-A** initiates a communication with **VM-B**. The packet goes through the Dynamic Routing Gateway (DRG) and is forced by the VCN **RT: vcn-hub-ingress** to pass through a **NFW-hub-int**. After inspection, the **NFW-hub-int** uses **RT: vcn-hub-subnet-int** to route the packet back to the DRG and then to the **vcn-spoke-B**. The response packet follows similar flow to get back to the **VM-A**.





&nbsp; 

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
