# **[OCI Remote Peering Connections](#)**
## **An OCI Open LZ [Addon](#) for Remote Peering Across Regions and Tenancies using IaC**
&nbsp;
## **DRG Route Table Design and Sample json's**

### 1. DRG Routing Design

The diagram below illustrates a sample routing setup for a multi-tenancy/multi-region RPC configuration. The left side represents the Tenancy1 with a firewall setup (HUB Model A), while the right side depicts the Tenancy2 region setup without a firewall (HUB Model E).


<img src="../images/drg-routing.png" width="100%">

> [!NOTE]  
> The above diagram serves as a reference for designing DRG routing based on specific architecture requirements. The Tenancy 1 & 2 may follow different DRG routing styles, such as having firewalls on both sides, only on the Tenancy 1, or a mix of various configurations.

&nbsp;
### 2. Sample JSON Configuration for RPC  

#### Configuration Details:  

- **Tenancy 1 Configuration**  
  - `tenancy1_iam.json` defines the compartment groups and policies required for RPC setup in the Tenancy1.  
  - `tenancy1_network.json` defines the Hub and Spoke network setup, including the Remote Peering Connection and associated route tables. The Tenancy1 JSON configuration follows **OCI Open LZ - Hub A**.  
    - To learn more about **HUB Model A**, refer to the [OCI Open LZ - Hub A Documentation](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_a).  

- **Tenancy 2 Configuration**  
  - `tenancy2_iam.json` defines the compartment groups and policies required for RPC setup in the Tenancy2.  
  - `tenancy2_network.json` defines the Hub and Spoke network setup, including the Remote Peering Connection and associated route tables. The Tenancy2 JSON configuration follows **OCI Open LZ - Hub E**.  
    - To learn more about **HUB Model E**, refer to the [OCI Open LZ - Hub E Documentation](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_e).  

> [!NOTE]  
> To spin up **Tenancy 1** or **Tenancy 2** with the **One-OE (HUB E) single-stack** plus **RPC** configuration, navigate to the respective directories below to access the complete JSON configuration files:
>
> - [tenancy1](./tenancy1/)
> - [tenancy2](./tenancy2/)


#### License
Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
