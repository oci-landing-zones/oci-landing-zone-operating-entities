# OCI Open LZ - [Hub C](#)
## A Hub with 3rd Party FW - Active/Active

&nbsp; 

**Table of Contents**

- [OCI Open LZ - Hub C](#oci-open-lz---hub-c)
  - [A Hub with 3rd Party FW - Active/Active](#a-hub-with-3rd-party-fw---activeactive)
    - [1. Overview](#1-overview)
    - [2. Components](#2-components)
    - [3. Specifications and Considerations](#3-specifications-and-considerations)
    - [4. Routing](#4-routing)
      - [Legend:](#legend)
    - [5. Automation](#5-automation)
- [License](#license)

&nbsp;

### 1. Overview
**Hub C** features third-party network firewalls configured in an Active/Active design, paired with OCI private Network Load Balancers operating in transparent mode with symmetric hashing to ensure packet flow symmetry. These firewalls manage both Inbound/Outbound (North-South) and East-West traffic, providing thorough control and inspection.

&nbsp; 

<img src="images/hub_c_design.png" width="250" height="value">

> [!NOTE]
> *This Hub diagram presents a general view of the **Hub C** architecture and its key concepts. A more detailed example, including routing tables and an internet-facing Load Balancer, is presented below.*

&nbsp;

###  2. Components
- VCN (Virtual Cloud Network)
- Two regional public subnets (depicted in green)
    1. public-subnet for External Network Load Balancer (NLB-Untrust) and the external interfaces of the firewalls (vNIC1)
    2. public-subnet for Load Balancer (LBaaS)
- Four regional private subnets (depicted in dark-orange)
    1. private-subnet for Internal Network Load Balancer (NLB-Trust) and the internal interfaces of the firewalls (vNIC2)
    2. private-subnet for management workloads (depending on the 3rd-party firewall vendor, additional interfaces may be created here, such as a management network interfaces)
    3. private-subnet for monitoring and logs
    4. private-subnet for DNS (for OCI DNS resolver endpoints)
- Internet Gateway
- Service Gateway
- Two OCI Network Load Balancers
- Two 3rd party Network Firewalls
- Public Load Balancer (LBaaS)

&nbsp;

### 3. Specifications and Considerations
- Symmetric hashing: Both OCI Network Load Balancers are private and operate in source and destination IP header preservation mode with symmetric hashing enabled. This feature prevents asymmetric routing, ensuring that request and return packets pass through the same firewall appliance.
- Firewalls: Third-party network firewalls are configured in Active/Active mode, ensuring resilience and scalability. The number of firewalls can be scaled up or down depending on throughput requirements and demand.
- NAT: This Hub model does not include a OCI NAT Gateway, as NAT functionality is handled by third-party firewalls (depending on specific requirements, this function can be configured and handled by an OCI NAT Gateway).
- Traffic visibility: Provides detailed control over inbound/source traffic entering or outbound traffic leaving the Hub VCN.
- License flexibility: Possibility to use already existing license (BYOL) from a specific vendor.

&nbsp;

### 4. Routing

The following diagram presents a Hub & Spoke architecture diagram with corresponding routing tables and routing rules.

<img src="images/hub_c_routing.png" width="900" height="value">

&nbsp;

#### Legend:

<img src="images/oci_hub_models_legend.png" width="200" height="value">

&nbsp;

For a comprehensive understanding of how network packets flow within **Hub C** and Spoke VCNs refer to the [Network packet flow animation - Hub C](/addons/oci-hub-models/hub_c/hub-c-packet_flow.md).

&nbsp;

> [!NOTE]
> *The CIDR ranges shown in the architecture diagram are for illustrative purposes only and should be adjusted to align with each specific use case.*

&nbsp;


### 5. Automation

For automating this Hub model use the [OCI LZ Network](https://github.com/oci-landing-zones/terraform-oci-modules-networking) Terraform modules. As an example configuration please refer to [oci_open_lz_hub_a_network_light.auto.tfvars.json](../hub_a/oci_open_lz_hub_a_network_light.auto.tfvars.json).


&nbsp; 

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
