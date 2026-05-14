# **[OCI Remote Peering Connections](#)**
## **An OCI Open LZ [Addon](#) for Remote Peering Across Regions and Tenancies using IaC**
&nbsp;
## **DRG Route Table Design and Sample json's**

### 1. DRG Routing Design

The diagram below illustrates a sample routing setup for a multi-tenancy/multi-region RPC configuration. The left side represents the Connectivity Hub tenancy with a firewall setup (HUB Model A), while the right side depicts the OE1/DR region setup without a firewall (HUB Model E).


<img src="../images/drg-routing.png" width="100%">

> [!NOTE]  
> The above diagram serves as a reference for designing DRG routing based on specific architecture requirements. The Connectivity Hub and OE1 may follow different DRG routing styles, such as having firewalls on both sides, only on the Connectivity Hub, or a mix of various configurations.

&nbsp;
### 2. Sample JSON Configuration for RPC  

#### Configuration Details:

- **Tenancy 1 (RPC Acceptor, old Connectivity Hub/CH)**
  - Runtime files are in `runtime/tenancy1/`.
  - `tenancy1_iam.auto.tfvars.json` includes the RPC acceptor IAM policy.
  - `tenancy1_network_hub_e.auto.tfvars.json` includes RPC DRG and route extensions.
  - CIDR baseline follows `10.0.x.x`.

- **Tenancy 2 (RPC Requester, old OE1)**
  - Runtime files are in `runtime/tenancy2/`.
  - `tenancy2_iam.auto.tfvars.json` includes the RPC requester IAM policy.
  - `tenancy2_network_hub_e.auto.tfvars.json` includes RPC DRG and route extensions.
  - Tenancy 2 network JSON carries the RPC `peer_id` for peering to Tenancy 1.
  - CIDR baseline follows `10.1.x.x`.



#### License
Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
