## Site-to-Site VPN for the One-OE Landing Zone

&nbsp;

### Overview

[OCI Site-to-Site VPN](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/overviewIPsec.htm) connects your on-premises network to OCI using encrypted IPSec tunnels over the internet. The remote endpoint can also be a compatible VPN gateway in another cloud.

The Hybrid Connectivity addon creates the OCI VPN resources, connects them to the landing zone’s DRG, and configures the associated routing. It supports static routing and BGP dynamic routing.



#### Main components

| Resource | Purpose |
|---|---|
| **CPE object** | The OCI representation of the remote VPN device, including its public IP address. |
| **IPSec connection** | Associates the CPE object with the landing zone’s DRG and contains two redundant IPSec tunnels. |
| **Route Table** | Configures static route table `drgrt-fra-lz-hc`, which routes all the destined CIDRs to the Hub attachment as the next hop. |
| **Customer-premises equipment (CPE) device** | The physical or software VPN gateway in the remote network, configured separately from this addon. |

Configure both tunnels on the remote VPN gateway to support redundancy.

&nbsp;

#### Architecture and routing

The diagram illustrates Site-to-Site VPN connectivity to a One-OE Landing Zone with **Hub A**.

<img src="./images/oneoe-vpn.png" width="1100" alt="Site-to-Site VPN connected to a One-OE Landing Zone with Hub A and production and preproduction spoke VCNs">

&nbsp;

Both VPN tunnel attachments use the `drgrt-fra-lz-hc` DRG route table. Its routes direct traffic for the local VCNs through the hub attachment. After inspection, the DRG uses the hub attachment’s route table to reach the destination spoke or VPN tunnel.

The selected hub determines the inspection path: Hubs A, B, and C retain their firewall routing; Hub E routes directly between the VPN and local VCNs.

Routes provide reachability. Firewall policies, network security groups (NSGs), and security lists must also permit the required traffic.

&nbsp;

### Configuration requirements

Prepare the following values before configuring the connection:

| Input | Requirement |
|---|---|
| **CPE public IP address** | The remote VPN gateway’s public IPv4 address, or its translated public address when behind NAT. Alternatively, provide an existing CPE object OCID. |
| **Remote network CIDRs** | Networks reachable through the VPN. These must not overlap the connected OCI networks. |
| **Tunnel settings** | Routing type, IKE version, and shared secret source for each tunnel. |
| **BGP settings** | For BGP routing: the customer ASN and a separate customer/Oracle inside-tunnel IP pair for each tunnel. |
| **CPE IKE identifier** | Required when the identity presented by the remote gateway differs from the public IP recorded in the CPE object. |

&nbsp;

### VPN Routing types

| Option | Configuration |
|---|---|
| **Static routing** | Specify the remote network CIDRs. Configure corresponding routes to the OCI networks on the remote gateway. |
| **BGP dynamic routing** | Configure the customer ASN and inside-tunnel IP addresses, then establish BGP sessions and advertise the required networks on the remote gateway. |

For BGP, each inside-tunnel pair must use different host addresses in the same `/30` or `/31` subnet. Use a separate subnet for each tunnel and avoid [OCI’s reserved inside-tunnel ranges](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm).

The add-on requires `remote_cidrs` for both routing options to prepare landing zone routes. With BGP, the actual remote routes must also be advertised by the peer; `remote_cidrs` does not configure BGP advertisements or prefix filters.

&nbsp;

### Tunnel authentication and IKE settings

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





























































------------------------

### IP Addresses and Network Ranges

Several fields contain IP addresses, but they serve different purposes:

| Address | Where it belongs | Illustrative value |
|---|---|---|
| Customer VPN public IP | The CPE object; Oracle must be able to reach this endpoint. Behind NAT, use the translated public address. | `203.0.113.5` |
| Oracle VPN public IP | Your router's remote VPN endpoint. Obtain each tunnel's actual value from OCI after creation. | Supplied by OCI |
| VPN inside-tunnel IP pair | The customer and Oracle interfaces inside one tunnel; required here for BGP. These are separate from the public endpoints. | Customer `169.254.20.1/30`, Oracle `169.254.20.2/30` |
| Private FastConnect BGP IP pair | The two ends of the circuit's BGP session. | Customer `192.168.254.1/30`, Oracle `192.168.254.2/30` |
| Remote network CIDR | The destination networks behind the customer router. | `172.20.0.0/16` |

The examples are working shapes for configuration, not an address allocation for your network. Confirm ranges with your network team before using it. See [OCI's VPN components](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/overviewIPsec.htm) for the service terminology.

&nbsp;

## Configuration

### Configure in Landing Zone Studio

[![Open Landing Zone Studio](https://img.shields.io/badge/Open%20Landing%20Zone%20Studio-C74634?style=for-the-badge)](https://oci-landing-zones.github.io/oci-landing-zone-operating-entities/)

1. Open your design and select **Hub Network**.
2. Expand **VPN** to configure equipment and VPN connections, or **FastConnect** to configure provider circuits. The sections open independently.
3. Add a name for each resource, then enter your agreed settings. Each field's information button explains its purpose, shows an example and links to Oracle documentation when useful. Hover or click to open help, or focus the information button and press Enter/Space. Press Escape to dismiss it.
4. Expand a connection to edit it. Keep both VPN tunnels configured. Advanced IKE and circuit settings are available when your equipment or provider requires them.
5. Review the network diagram and routing views. Select **Review** and resolve the reported errors before downloading.

For FastConnect bandwidth, choose a common value or enter a custom value such as `20 Gbps`. Use a positive integer, one space and `Gbps`. The common choices are not a live OCI lookup: available shapes depend on your provider and region. Confirm the offered bandwidth with your provider and [OCI's provider connection guidance](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectprovider.htm).

Inline keys use masked inputs and stay in the current session. Saved designs preserve the selected authentication method but require key re-entry when reopened. Studio does not cache generated files containing those keys. The downloaded configuration and network files contain the actual values, so keep the download private.

### Configure with Blueprint Factory

Add the optional top-level `hybrid_connectivity` object to your landing zone JSON configuration. It contains four named resource maps:

| Map | Use it to |
|---|---|
| `customer_premises_equipments` | Create OCI records for your VPN equipment. |
| `ipsecs` | Configure VPN connections and both tunnels. |
| `fast_connect_virtual_circuits` | Configure private circuits. |
| `cross_connect_groups` | Prepare physical FastConnect groups and ports. |

The [complete configuration reference](../oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md#9-vpn-and-fastconnect) lists every accepted field, required values and defaults. Studio exposes the main connection settings; use the factory input for optional fields that Studio does not expose, such as the circuit provisioning flag.

Studio offers provider services with verified OCIDs for the design's realm and region. If no verified provider OCIDs are available, Studio shows the OCID field directly. Use manual identifier entry for an unlisted service; its information button includes the OCI CLI list command.

Choose the closest complete example:

| Example | Starting point |
|---|---|
| [Static VPN](examples/01-vpn-static.json) | Two static tunnels and inline demonstration keys. |
| [BGP VPN](examples/02-vpn-bgp.json) | Distinct inside-tunnel address pairs and an existing secret reference. |
| [FastConnect and VPN](examples/03-fastconnect-vpn-backup.json) | Private provider circuit and VPN with identical remote prefixes. |
| [Existing physical connections](examples/04-existing-physical.json) | A circuit referring to ready cross-connect/group OCIDs. |
| [Physical preparation](examples/05-physical-preparation.json) | Groups and ports, with final circuits omitted. |

Each example includes an illustrative landing zone baseline. For an existing landing zone, merge the relevant `hybrid_connectivity` settings into its current private source configuration; preserve its region, hub, networks and workloads. Do not replace an existing design with an example or apply it as a second copy of the landing zone.

&nbsp;

## VPN Configuration

### Case 1: VPN with static routes

Use this case when your team will maintain the network routes explicitly.

1. **Gather:** obtain the reachable CPE public IP, the remote CIDRs, the OCI networks that the router must reach, the router's IKE version and the chosen source for each tunnel's key. Confirm whether the router's IKE identity differs from its public IP; if it does, follow [case 3](#case-3-vpn-behind-nat-or-with-a-different-ike-identity).
2. **Enter in Studio:** under **VPN → Customer VPN equipment**, add a CPE and enter **Public IPv4 address**. New CPE records use the **Other** device type. Under **Site-to-Site VPN**, add a VPN, select that **Customer equipment**, and enter **Remote IPv4 CIDRs**. Alternatively, select **Existing CPE OCID** and supply a CPE object already in OCI.
3. **Configure both tunnels:** expand **Tunnel 1** and **Tunnel 2**. Set **Routing** to **Static**, match **IKE version** to the router and choose each **Key source**. For static routing, inside IP pairs are optional in factory input. Leave advanced proposals unchanged unless agreed with the router administrator.
4. **Generate and apply:** review/export Studio's files, or add the equivalent `ipsecs` settings to private source. Follow [the deployment procedure](#9-deployment), using the existing landing zone's state for an update.
5. **Configure the peer and test:** obtain both Oracle public tunnel endpoints and the correct key for each tunnel from OCI through your approved process. Your network team configures both router tunnels and return routes to the OCI networks. Then follow [validation](#10-validation-and-troubleshooting). If a tunnel is down, first check endpoint reachability, keys, IKE identity and proposals; if it is up but traffic fails, check routes and permissions.

**Manual post-deployment configuration required:** the add-on does not configure your router. A newly created tunnel can remain **Down** until the peer is configured and compatible IKE/IPSec negotiation succeeds. Terraform does not need a working router to create the OCI connection. Use the [CPE Configuration Helper](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/CPEconfigurationhelper.htm) or an equipment-specific Oracle guide to prepare the router handover.

### Case 2: VPN with BGP

Use this case when the routers will exchange network routes. Start from [the BGP VPN example](examples/02-vpn-bgp.json), which demonstrates an inline key and an existing Vault secret reference.

1. **Gather:** collect the VPN inputs from case 1, plus the customer ASN and a customer/Oracle inside IP pair for each tunnel. Each pair must contain different hosts in the same `/30` or `/31`; use a separate subnet for the second tunnel. For example, tunnel 1 could use `169.254.20.1/30` and `169.254.20.2/30`, with tunnel 2 using `169.254.21.1/30` and `169.254.21.2/30`. Check Oracle's [excluded inside ranges](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm) and your own address plan before choosing values.
2. **Enter in Studio:** create/select the CPE and VPN as in case 1. Keep **Remote IPv4 CIDRs** populated: the add-on uses them for intended landing zone reachability even when BGP exchanges the actual routes.
3. **Configure each tunnel:** select **BGP**, then fill **Customer BGP ASN**, **Customer tunnel IP/prefix** and **Oracle tunnel IP/prefix**. Set the IKE/key choices independently for both tunnels. Factory input uses `bgp_session_info` for the same values.
4. **Generate and apply:** use [the same deployment procedure](#9-deployment). If a key references the landing zone Vault, complete the [secret prerequisites](#8-keys-and-the-landing-zone-vault) before applying that reference.
5. **Configure the peer and test:** the network team configures each tunnel and BGP neighbor using OCI's actual tunnel details and the agreed ASNs/addresses. It advertises only the approved remote networks and checks routes received from OCI. Verify tunnel **Up**, then BGP established, then an application flow. Tunnel **Up** with BGP down points to the BGP configuration; BGP established with missing traffic points to advertisements, routes or traffic controls.

An intended remote CIDR in the source file does not make the customer router advertise that network. The router team owns its BGP advertisements and filters.

### Case 3: VPN behind NAT or with a different IKE identity

IKE identity is the name/address the router presents during VPN authentication. It can differ from the public IP that receives internet packets. This case applies to either static or BGP VPN.

1. **Gather:** ask the router administrator for the exact local IKE identity it sends: an IP address or a fully qualified hostname. If NAT is present, also obtain the translated public IP reachable by Oracle and confirm the VPN/NAT settings with the administrator.
2. **Enter the public endpoint:** the CPE's **Public IPv4 address** remains the translated public address. Do not replace it with the router's private inside address.
3. **Enter the identity when needed:** expand the VPN's **Router identity** section. Fill **CPE local identifier** with the router's actual IKE identity and choose the matching **CPE identifier type**. Factory input uses `cpe_local_identifier` and `cpe_local_identifier_type` on the VPN connection. Selecting **Hostname** requires an entered identity.
4. **Apply and verify:** review the update in the existing state, apply it, and have the network team confirm that both sides expect the same identity. An identity mismatch can prevent tunnel establishment even when the public endpoints are reachable and the keys match.

When no identifier is supplied, OCI uses the IP address stored on the CPE object. Leaving the field empty is appropriate only when that matches the identity sent by your router. **You must supply the differing identity when the router sends a different value**, which is common behind NAT. See [OCI's NAT and IKE identity guidance](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/overviewIPsec.htm#nat) and the [VPN setup guide](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm).



&nbsp;



## Routing

| Connection or hub | Routing behavior |
|---|---|
| VPN | Both OCI-created tunnel attachments use the shared `hc` (Hybrid Connectivity) ingress table. |
| Private FastConnect | Each managed private circuit attachment uses the same `hc` ingress table as VPN. |
| Hubs A/B/C | Incoming local destinations pass through the existing hub/firewall path. |
| Hub E | Incoming traffic routes directly to hub, environment and platform VCNs. |

The shared `hc` table contains local destinations, keeping the ingress policy consistent across VPN and FastConnect. The add-on assigns it to its managed attachments; it does not change DRG-wide defaults for future attachments created elsewhere. See [OCI's default table assignment guidance](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-rt-default-assignment.htm).

Remote CIDRs describe intended reachability. They do not filter BGP advertisements or grant firewall access. Local/remote overlap and partial overlap between distinct remote prefixes are rejected.

For private FastConnect with VPN backup, configure identical reviewed remote prefixes on both paths. ECMP is disabled. OCI's route selection and the routes actually advertised by your peers determine the active path; the add-on does not force FastConnect to be primary. Test failover and return traffic with your network team.

&nbsp;

## Keys and the Landing Zone Vault

For a new VPN tunnel, omitting `shared_secret` lets OCI generate a key. Alternatively, put a literal key in that field or reference an existing secret OCID beginning `ocid1.vaultsecret.`. Removing a configured value does not reset or regenerate an existing tunnel's key.

Entered keys belong directly in the corresponding field of the private JSON configuration. This workflow does not require a separate secrets file. A Vault reference is a secret's OCID in that same field; it is not an instruction to create a new secret automatically.

Literal VPN keys use letters, numbers and spaces. FastConnect BGP MD5 authentication uses the separate `bgp_md5auth_key` field and accepts a literal value; it does not resolve secret OCIDs.

If you want to use a secret in a newly created landing zone Vault:

1. Deploy the landing zone with the VPN entry omitted until its Vault is available.
2. Create the secret in the LZ Vault and grant the required read access through your approved process.
3. Add the VPN with the secret OCID, regenerate, and apply the updated network file in the same Terraform state.

See [OCI Secret Management](https://docs.oracle.com/en-us/iaas/Content/secret-management/home.htm). Protect downloaded configurations, Terraform state and raw networking outputs; they can contain keys. Keep them out of public buckets, public repositories, logs and support tickets.

&nbsp;

## Deployment

The committed [Hub B with BGP VPN network configuration](runtime/oneoe_network_hub_b_vpn_bgp.json) includes `prod` and `preprod` environments and two IKEv2 BGP tunnels. Use it as the network input with the other [One-OE configuration files](../../blueprints/one-oe/runtime/one-stack/readme.md). Replace the example router address, remote CIDRs and BGP values before deployment; OCI generates the tunnel keys.

Deploy the complete configuration file set for your landing zone using the existing steps:

1. [Oracle Resource Manager (ORM) deployment steps](../../commons/content/orm.md).
2. [Terraform CLI deployment steps](../../commons/content/terraform.md).

For updates, use the existing landing zone's Terraform state and review the plan before applying.

&nbsp;

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0. See [LICENSE](../../LICENSE.txt).
