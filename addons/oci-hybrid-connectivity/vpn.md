## Site-to-Site VPN for the One-OE Landing Zone

&nbsp;

### Overview

[OCI Site-to-Site VPN](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/overviewIPsec.htm) connects your remote network (on-premises, other cloud service provider) to OCI using encrypted IPSec tunnels over the internet. 

The Hybrid Connectivity addon creates the OCI VPN resources, connects them to the One-Oe Landing Zone’s DRG, and configures the associated routing. It supports static routing and BGP dynamic routing for Site-to-Site VPN.



#### Main components

| Resource | Purpose |
|---|---|
| **CPE object** | The OCI representation of the remote VPN device, including its public IP address. |
| **IPSec connection** | Connects the CPE object to the Landing Zone’s DRG and contains two redundant IPSec tunnels. |
| **DRG Route Table** | Custom route table `drgrt-fra-lz-hc`, which directs traffic to the appropriate next hop based on the deployed hub model. |

&nbsp;

#### Architecture and routing

This architecture diagram illustrates **Site-to-Site VPN connectivity** to an **OCI One-OE Landing Zone with Hub A**. The VPN connection uses **BGP dynamic routing**, and the diagram shows the IPv4 addresses assigned to both ends of each IPSec tunnel.

Both VPN tunnel attachments are associated with the `drgrt-fra-lz-hc` DRG route table, which directs traffic destined for the hub and spoke VCNs through the hub attachment. Traffic between the remote network and spoke VCNs passes through the internal network firewall for inspection in both directions.

This routing and inspection model applies to **One-OE Landing Zone deployments with Hubs A, B, and C**. For **Hub E**, traffic between the remote network and spoke VCNs is routed directly through the DRG without traversing the hub VCN, as Hub E does not include a network firewall.

<img src="./images/oneoe-vpn.png" width="1100" alt="Site-to-Site VPN connected to a One-OE Landing Zone with Hub A and production and preproduction spoke VCNs">

&nbsp;

> [!NOTE]
> With the routing configuration shown, traffic between the remote network and the Hub VCN’s private subnets (`sn-fra-lz-hub-mgmt`, `sn-fra-lz-hub-mon`, and `sn-fra-lz-hub-dns`) does not pass through the internal network firewall. If these flows also require inspection, update the relevant routing rules in both directions to maintain symmetric routing through the firewall.


&nbsp;

#### Configuration requirements

| Input | Requirement |
|---|---|
| **CPE public IP address** | The remote VPN gateway’s public IPv4 address, or its translated public address when behind NAT. Alternatively, provide an existing CPE object OCID. |
| **Remote network CIDRs** | Networks reachable through the VPN. These must not overlap the connected OCI networks. |
| **Tunnel settings** | Routing type, IKE version, and shared secret source for each tunnel. |
| **BGP settings** | For BGP routing: the customer ASN and a separate customer/Oracle inside-tunnel IP pair for each tunnel. |
| **CPE IKE identifier** | Required when the identity presented by the remote gateway differs from the public IP recorded in the CPE object. |

&nbsp;

#### VPN Routing types

| Option | Configuration |
|---|---|
| **Static routing** | Specify the remote network CIDRs. Configure corresponding routes to the OCI networks on the remote gateway. |
| **BGP dynamic routing** | Configure the customer ASN and inside-tunnel IP addresses, then establish BGP sessions and advertise the required networks on the remote gateway. |

For BGP, each inside-tunnel pair must use different host addresses in the same `/30` or `/31` subnet. Use a separate subnet for each tunnel and avoid [OCI’s reserved inside-tunnel ranges](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm).

The addon requires `remote_cidrs` for both routing options to prepare landing zone routes. With BGP, the actual remote routes must also be advertised by the peer; `remote_cidrs` does not configure BGP advertisements or prefix filters.

&nbsp;

#### Tunnel authentication and IKE settings

For each tunnel, use an OCI-generated shared secret, provide a shared secret, or reference an existing OCI Vault secret. Referenced secrets must exist and be readable by the deployment principal before deployment.

&nbsp;

## Prepare the configuration

### Option 1: Landing Zone Studio

[![Open Landing Zone Studio](https://img.shields.io/badge/Open%20Landing%20Zone%20Studio-C74634?style=for-the-badge)](https://oci-landing-zones.github.io/oci-landing-zone-operating-entities/)

1. Open your landing zone design and expand **Hub Network → VPN**.
2. Under **Customer VPN equipment**, create a CPE entry, or select **Existing CPE OCID** when adding the VPN.
3. Under **Site-to-Site VPN**, select the customer equipment and enter the **Remote IPv4 CIDRs**.
4. Configure **Tunnel 1** and **Tunnel 2**, including routing, IKE version, shared secret source, and BGP settings where applicable. Set **Router identity** if the CPE sends a different IKE identifier.
5. Review the configuration, resolve validation errors, and download the deployment files.

### Option 2: Blueprint Factory

Add `hybrid_connectivity` to your landing zone source configuration:

- Use `customer_premises_equipments` to define a new CPE object.
- Use `ipsecs` to define the VPN connection, its remote CIDRs, and both tunnels.
- Reference the CPE using `cpe_key`, or use `cpe_id` for an existing CPE object.

Generate the deployment files using the [Blueprint Factory workflow](../oci-lz-blueprint-factory/README.md#4-generation-workflow). For field definitions, see the [VPN configuration reference](../oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md#93-vpn-connections).

&nbsp;

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0. See [LICENSE](../../LICENSE.txt).