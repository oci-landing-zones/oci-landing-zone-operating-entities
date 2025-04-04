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

- **Connectivity Hub (CH) Configuration**  
  - `connectivity-hub_iam.auto.tfvars.json` defines the compartment groups and policies required for RPC setup in the Connectivity Hub tenancy.  
  - `connectivity-hub_network.auto.tfvars.json` defines the Hub and Spoke network setup, including the Remote Peering Connection and associated route tables. The Connectivity Hub JSON configuration follows **OCI Open LZ - Hub A**.  
    - To learn more about **HUB Model A**, refer to the [OCI Open LZ - Hub A Documentation](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_a).  

- **Operating Entity 1 (OE1) Configuration**  
  - `oe1_iam.auto.tfvars.json` defines the compartment groups and policies required for RPC setup in the OE1 tenancy.  
  - `oe1_network.auto.tfvars.json` defines the Hub and Spoke network setup, including the Remote Peering Connection and associated route tables. The OE1 JSON configuration follows **OCI Open LZ - Hub E**.  
    - To learn more about **HUB Model E**, refer to the [OCI Open LZ - Hub E Documentation](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_e).  



#### License
Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
