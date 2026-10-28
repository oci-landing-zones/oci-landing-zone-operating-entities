# **OCI Hybrid Connectivity**
## **An OCI Open LZ Add-on for Site-to-Site VPN and FastConnect**

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Connection Options](#2-connection-options)<br>
[3. Prerequisites](#3-prerequisites)<br>
[4. Configuration](#4-configuration)<br>
[5. VPN Configuration](#5-vpn-configuration)<br>
[6. FastConnect Configuration](#6-fastconnect-configuration)<br>
[7. Routing](#7-routing)<br>
[8. Keys and the Landing Zone Vault](#8-keys-and-the-landing-zone-vault)<br>
[9. Deployment](#9-deployment)<br>
[10. Validation and Troubleshooting](#10-validation-and-troubleshooting)<br>
[11. External Work and Responsibilities](#11-external-work-and-responsibilities)<br>
[12. Compatibility and Current Limits](#12-compatibility-and-current-limits)<br>

&nbsp;

## 1. Overview

Use this add-on to connect your on-premises network to OCI with Site-to-Site VPN, FastConnect, or both. You configure the connection in [Landing Zone Studio](../oci-landingzone-studio/README.md) or the [Blueprint Factory](../oci-lz-blueprint-factory/README.md). Terraform creates the OCI resources and the landing zone routes.

Your network team still configures the customer router, approves traffic through security controls, and completes any carrier work. Creating routes alone does not make a connection operational.

&nbsp;

## 2. Connection Options

### Connection Terms

| Term | What it means for your setup |
|---|---|
| Customer premises equipment (CPE) | Your VPN router or firewall. The **CPE object** created in OCI records its reachable IP address and optional device model; it does not install settings on the physical device. |
| IPSec connection | The OCI VPN resource connecting that equipment to the landing zone. It contains two tunnels. Configure both so that a single tunnel outage does not remove your only path. |
| Tunnel | An encrypted path between your equipment and one Oracle VPN endpoint. Each tunnel has its own endpoint, key and settings. |
| Dynamic Routing Gateway (DRG) | The OCI router connecting external networks to the landing zone. This add-on uses the landing zone's existing DRG and assigns routing tables to the connections it manages. |
| CIDR / remote network | An address range, such as `172.20.0.0/16`. Here, **remote** means the networks on your side that OCI must reach. |
| Route / route table | Instructions telling a router where to send traffic for an address range. Routes must exist for the return journey too. Firewall rules separately decide which traffic is permitted. |
| BGP / ASN | BGP lets routers exchange reachable networks. An autonomous system number (ASN) identifies the network in that exchange. Your network team supplies the customer ASN. |
| FastConnect virtual circuit | A logical connection over an activated provider or physical service. This add-on supports private circuits connected to the landing zone DRG. |
| Cross-connect / group | A physical connection at a FastConnect location, or a group of those connections. The circuit refers to an already provisioned connection by its OCID. |
| OCID | OCI's resource identifier. Copy the identifier for the requested resource, rather than its display name or the name used in your source configuration. |

### IP Addresses and Network Ranges

Several fields contain IP addresses, but they serve different purposes:

| Address | Where it belongs | Illustrative value |
|---|---|---|
| Customer VPN public IP | The CPE object; Oracle must be able to reach this endpoint. Behind NAT, use the translated public address. | `203.0.113.10` |
| Oracle VPN public IP | Your router's remote VPN endpoint. Obtain each tunnel's actual value from OCI after creation. | Supplied by OCI; do not invent it. |
| VPN inside-tunnel IP pair | The customer and Oracle interfaces inside one tunnel; required here for BGP. These are separate from the public endpoints. | Customer `169.254.20.1/30`, Oracle `169.254.20.2/30` |
| Private FastConnect BGP IP pair | The two ends of the circuit's BGP session. | Customer `192.168.254.1/30`, Oracle `192.168.254.2/30` |
| Remote network CIDR | The destination networks behind the customer router. | `172.20.0.0/16` |

The examples are working shapes for configuration, not an address allocation for your network. Confirm every range with your network team before using it. See [OCI's VPN components](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/overviewIPsec.htm) for the service terminology.

### Choose the Connection You Need

| Your situation | Choose | What you need from your network team |
|---|---|---|
| You need encrypted connectivity over the internet, with a stable list of remote networks and no BGP setup | [Static VPN](#case-1-vpn-with-static-routes) | Reachable public equipment IP, remote CIDRs, both tunnel configurations and keys. Route changes need coordinated configuration updates. |
| Your router supports BGP and your team wants routers to exchange routes | [BGP VPN](#case-2-vpn-with-bgp) | The VPN inputs above, customer ASN and a separate inside IP pair for each tunnel. |
| Your VPN router sits behind a device that translates its address | [NAT / peer identity](#case-3-vpn-behind-nat-or-with-a-different-ike-identity), with static or BGP routing | The translated public IP and the actual IKE identity sent by the router. NAT is an additional VPN consideration, not a third routing choice. |
| An Oracle partner supplies your dedicated connection to private OCI networks | [Private provider FastConnect](#case-4-private-fastconnect-through-an-oracle-partner) | Provider service OCID, offered bandwidth, activation details and the BGP settings that the provider asks you to supply. |
| You have ready physical cross-connects, or need to arrange them | [Direct / physical FastConnect](#case-5-private-fastconnect-over-physical-connections) | Provisioned physical OCIDs, VLAN and BGP settings; new ports also require cabling and activation. |
| Private FastConnect needs an alternative internet path | [FastConnect with VPN backup](#case-6-fastconnect-with-vpn-backup) | Both working services, identical reviewed remote prefixes and a tested routing preference policy. |

Only private FastConnect circuits are supported. Existing public-circuit source configurations are rejected and are never converted to private circuits automatically.

This version supports IPv4, static or BGP VPN routing, both VPN tunnels, private circuits, and physical cross-connect preparation. It uses the released Orchestrator **v2.2.0**, Networking **v0.9.0** and Security **v0.2.3** modules without requiring changes to those repositories.

Every case follows the same handover: agree the values, enter them in Studio or private Blueprint Factory source, generate and review a Terraform update, configure the customer/provider side, then test the complete path. **A successful Terraform apply means OCI resources were configured; it does not mean that the external peer is ready.**

&nbsp;

## 3. Prerequisites

Before editing a design, agree these inputs with the people who operate your external network:

- The remote networks that need OCI access. Keep their address ranges separate from the landing zone's hub, environment and platform networks.
- For VPN, the customer equipment's public IP or existing OCI CPE object. A CPE object is OCI's record of your router; it does not configure the router.
- For BGP, your autonomous system number (ASN) and the IP addresses used by the two ends of each BGP session.
- For FastConnect, the connection model, provider service or physical connection details, bandwidth, VLAN and peering addresses where applicable.
- The permitted traffic, key-management process and maintenance window.

Use [OCI's VPN setup guide](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm) and [FastConnect requirements](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectrequirements.htm) when agreeing service-specific values. The examples in this repository contain illustrative addresses and OCIDs; replace them before deployment.

&nbsp;

## 4. Configuration

### Configure in Landing Zone Studio

1. Open your design and select **Hub Network**.
2. Expand **VPN** to configure equipment and VPN connections, or **FastConnect** to configure circuits and optional physical preparation. The sections open independently.
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

Studio offers maintained device-vendor choices and provider services with verified OCIDs for the design's realm and region. If no verified provider OCIDs are available, Studio shows the OCID field directly. Use manual identifier entry for an unlisted service; its information button includes the OCI CLI list command. Vendor selection uses OCI's first matching device template; use an explicit shape identifier when you need an exact model.

Choose the closest complete example:

| Example | Starting point |
|---|---|
| [Static VPN](examples/01-vpn-static.json) | Two static tunnels and inline demonstration keys. |
| [BGP VPN](examples/02-vpn-bgp.json) | Distinct inside-tunnel address pairs and an existing secret reference. |
| [FastConnect and VPN](examples/03-fastconnect-vpn-backup.json) | Private provider circuit and VPN with identical remote prefixes. |
| [Existing physical connections](examples/04-existing-physical.json) | A circuit referring to ready cross-connect/group OCIDs. |
| [Physical preparation](examples/05-physical-preparation.json) | Groups and ports, with final circuits omitted. |

Each example includes an illustrative landing zone baseline. For an existing landing zone, merge the relevant `hybrid_connectivity` settings into its current private source configuration; preserve its region, hub, networks and workloads. Do not replace an existing design with an example or apply it as a second copy of the landing zone.

Keep the private source configuration and generated output in separate customer-controlled directories. From this repository, generate with your chosen paths:

```sh
bash gen/generate.sh --config /private/customer/lz/config.json /private/customer/lz/generated
```

Connectivity is included in `network.json` and the Hub C backend variant when applicable. Deploy only files from the same generation run. Do not combine them with published blueprint snapshots.

&nbsp;

## 5. VPN Configuration

### Case 1: VPN with static routes

Use this case when your team will maintain the network routes explicitly. Start from [the static VPN example](examples/01-vpn-static.json).

1. **Gather:** obtain the reachable CPE public IP, the remote CIDRs, the OCI networks that the router must reach, the router's IKE version and the chosen source for each tunnel's key. Confirm whether the router's IKE identity differs from its public IP; if it does, follow [case 3](#case-3-vpn-behind-nat-or-with-a-different-ike-identity).
2. **Enter in Studio:** under **VPN → Customer VPN equipment**, add a CPE and enter **Public IPv4 address**. Device shape is useful for matching an OCI router template but is not required. Under **Site-to-Site VPN**, add a VPN, select that **Customer equipment**, and enter **Remote IPv4 CIDRs**. Alternatively, select **Existing CPE OCID** and supply a CPE object already in OCI.
3. **Configure both tunnels:** expand **Tunnel 1** and **Tunnel 2**. Set **Routing** to **Static**, match **IKE version** to the router and choose each **Key source**. For static routing, inside IP pairs are optional in factory input. Leave advanced proposals unchanged unless agreed with the router administrator.
4. **Generate and apply:** review/export Studio's files, or add the equivalent `ipsecs` settings to private source and run the [Blueprint Factory command above](#configure-with-blueprint-factory). Follow [the deployment procedure](#9-deployment), using the existing landing zone's state for an update.
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

### Understand IKE and IPSec proposals

**Phase 1 (IKE)** authenticates the peers and establishes the protected negotiation channel. **Phase 2 (IPSec)** agrees how application traffic is protected. Both ends need compatible parameters; an allowed value in a dropdown is not proof that your router accepts the full combination.

OCI normally offers its supported proposal sets. Leaving **Custom algorithms** off therefore does not select a single cipher in Studio. Enable custom proposals only when the network team has agreed matching phase settings. Phase 2 AES-GCM includes authentication; a separate authentication algorithm is unnecessary with GCM. Oracle also documents that phase 2 behavior depends on which peer initiates negotiation. See [Supported IPSec Parameters](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/supportedIPsecparams.htm).

Studio lists allowed authentication, encryption and DH groups; the factory validates the same values even when custom proposals are disabled. The [configuration reference](../oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md#94-custom-ike-and-ipsec-settings) records this input contract. Empty optional fields retain OCI/module behavior; do not treat them as evidence of a particular active cipher or lifetime.

With custom algorithms off, Studio shows Oracle's published commercial-cloud proposal lists. It also shows the published lifetime values and inherited PFS setting: enabled with `GROUP5`. Selecting an inherited setting leaves the corresponding configuration field omitted; it does not write a fixed algorithm or pretend that a session has negotiated that value. Check your deployment's region and realm before applying the configuration.

Oracle's [supported IPSec parameters guide](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/supportedIPsecparams.htm) describes published proposals and settings; it does not report what your peer has negotiated. Confirm the algorithms actually used from established-session diagnostics on the peer and OCI's available tunnel diagnostics. Until a tunnel connects, there is no negotiated session to inspect. Coordinate changes to routing, keys and proposals in a maintenance window because they can interrupt the tunnel.

&nbsp;

## 6. FastConnect Configuration

Choose the connection model first: an Oracle partner supplies a provider service, while direct/third-party physical connectivity uses provisioned cross-connects. The circuit connects private networks to the landing zone DRG. A physical service and a virtual circuit are separate resources; creating a circuit does not order or activate a cable.

### Case 4: Private FastConnect through an Oracle partner

Use this case for private landing zone access over a partner service. The circuit in [the FastConnect and VPN example](examples/03-fastconnect-vpn-backup.json) is a starting point; include its VPN entries only if you also need the backup path.

1. **Gather:** obtain the provider service-offering OCID, offered bandwidth and activation/service key instructions. Agree the remote CIDRs and ask who operates the BGP session. If your router peers with Oracle, collect its ASN and the agreed customer/Oracle peering IP pair. If the provider owns BGP, follow its instructions about which fields to supply.
2. **Enter in Studio:** expand **FastConnect**, add a circuit, enter **Remote IPv4 CIDRs** and select a **Provider service** when the dropdown is available. Otherwise enter **Provider service OCID** for this location; the dropdown's **Other provider service (enter OCID)** option also allows manual entry. Then select **Provisioned bandwidth**. Common bandwidth choices are conveniences; use **Other bandwidth** for a different agreed shape. Exact availability depends on the service and region.
3. **Configure peering:** enter **Customer ASN** and the **BGP mapping** settings that apply to your service. Private IP pairs use `/28` through `/31`; `192.168.254.1/30` and `192.168.254.2/30` are illustrative. Enable MD5 authentication only when the peer uses the same agreed key. Enter an activation key under **Advanced circuit settings** if your provider requires it. The **Cross-connect and VLAN** section is for physical mapping details required by your connection model; do not invent a physical OCID for a provider-managed service.
4. **Generate and apply:** use [the deployment procedure](#9-deployment). Factory source uses `fast_connect_virtual_circuits`, `provider_service_id`, `bandwidth_shape_name` and the applicable mapping fields. Keep the existing landing zone and its state intact.
5. **Complete the provider handover:** give the provider the new virtual circuit OCID and its requested activation details. **Manual post-deployment configuration required:** the provider completes its end, and the customer team configures its router where applicable. A circuit can remain **Pending partner** with BGP down until this work is complete. Verify activation, BGP and an approved private application flow. See [Oracle's partner workflow](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectprovider.htm).

### Case 5: Private FastConnect over physical connections

Use [the existing physical connection example](examples/04-existing-physical.json) if the physical service is ready. If you need to prepare ports, start with [the physical preparation example](examples/05-physical-preparation.json).

1. **Gather:** agree the FastConnect location, port speed, service arrangement, redundancy, VLAN, circuit bandwidth, customer ASN, remote CIDRs and BGP peering pair. An OCI region name is not a physical location name; use values offered for your actual location and service.
2. **Prepare new ports if needed:** expand **Physical FastConnect preparation** in Studio and add a group and its ports, or add `cross_connect_groups` in factory source. Enter the offered location/port-speed names and any agreed proximity/reference settings. Generate and apply with final virtual circuits omitted. Skip this step when referencing physical resources already provisioned outside this configuration.
3. **Complete the physical work:** obtain the OCI letter of authorization for each port, arrange the provider/datacenter cabling, verify light levels and activate the connections using [Oracle's physical setup procedure](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectcolocate.htm). Confirm that the referenced cross-connect/group is provisioned before creating the circuit. **Manual external configuration required:** Terraform does not order the service, cable a port or certify that the link is ready.
4. **Add the private circuit:** in Studio, select **Direct / physical connection** for **Provider service**, or leave **Provider service OCID** empty when the dropdown is unavailable. Enter the remote CIDRs/bandwidth/ASN and open the BGP mapping's **Cross-connect and VLAN**. Enter the actual **Cross-connect/group OCID** and agreed **VLAN**, plus the private customer/Oracle BGP pair. Factory input uses `cross_connect_or_cross_connect_group_id`; the group name from step 2 is not accepted as an OCID.
5. **Apply the circuit update:** regenerate and review a plan in the same state. Keep any managed groups/ports in the source when adding circuits; removing their definitions can plan their destruction. Apply only the reviewed changes.
6. **Configure and verify the peer:** the network team configures its physical interface, any required link aggregation, VLAN and BGP neighbor. Check physical link readiness, BGP establishment, the assigned DRG table and an approved application flow. A good optical link with BGP down still needs correct activation, VLAN and peering settings.

### Case 6: FastConnect with VPN backup

Start from [the FastConnect and VPN example](examples/03-fastconnect-vpn-backup.json). It uses identical reviewed remote CIDRs for the private circuit and BGP VPN.

1. Complete the BGP VPN and private FastConnect walkthroughs. Establish both services before testing preference or failure.
2. Use the same remote prefixes on the intended alternative paths. These declarations create landing zone routes; the network team must also advertise those prefixes and control the customer-side path preferences.
3. Generate and apply one combined configuration through the existing landing zone state. The add-on disables ECMP and assigns its custom ingress tables; it does not force the circuit to be the preferred path.
4. With your network team, confirm the active forward and return routes, test approved traffic, interrupt the preferred path in a maintenance window, verify recovery over the other path, and restore the original service. Check both directions after restoration. If failover is wrong, inspect actual advertisements and route preferences rather than assuming that the service name selects the path.

See [the generated routing behavior](#7-routing) before agreeing a failover policy. The customer owns the external route policy and the failover test.

&nbsp;

## 7. Routing

| Connection or hub | Routing behavior |
|---|---|
| VPN | Both OCI-created tunnel attachments receive the add-on's custom VPN ingress table. |
| Private FastConnect | Each managed private circuit attachment receives the custom FastConnect ingress table. |
| Hubs A/B/C | Incoming local destinations pass through the existing hub/firewall path. |
| Hub E | Incoming traffic routes directly to hub, environment and platform VCNs. |

The ingress tables contain local destinations, rather than an unrestricted default route. They do not intentionally enable transit between external connections. The add-on assigns these tables to its managed attachments; it does not change DRG-wide defaults for future attachments created elsewhere. See [OCI's default table assignment guidance](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-rt-default-assignment.htm).

Remote CIDRs describe intended reachability. They do not filter BGP advertisements or grant firewall access. Local/remote overlap and partial overlap between distinct remote prefixes are rejected.

For private FastConnect with VPN backup, configure identical reviewed remote prefixes on both paths. ECMP is disabled. OCI's route selection and the routes actually advertised by your peers determine the active path; the add-on does not force FastConnect to be primary. Test failover and return traffic with your network team.

&nbsp;

## 8. Keys and the Landing Zone Vault

For a new VPN tunnel, omitting `shared_secret` lets OCI generate a key. Alternatively, put a literal key in that field or reference an existing secret OCID beginning `ocid1.vaultsecret.`. Removing a configured value does not promise to reset or regenerate an existing tunnel's key.

Entered keys belong directly in the corresponding field of the private JSON configuration. This workflow does not require a separate secrets file. A Vault reference is a secret's OCID in that same field; it is not an instruction to create a new secret automatically.

Literal VPN keys use letters, numbers and spaces. FastConnect BGP MD5 authentication uses the separate `bgp_md5auth_key` field and accepts a literal value; it does not resolve secret OCIDs.

For CIS2, you can use the Vault created by the landing zone. You do not need another Vault for this purpose, but the add-on does not create the secret or copy inline keys into it. The secret must exist and the deployment principal must be allowed to read its contents before Terraform applies the VPN reference.

If you want to use a secret in a newly created landing zone Vault:

1. Deploy the landing zone with the VPN entry omitted until its Vault is available.
2. Create the secret in the LZ Vault and grant the required read access through your approved process.
3. Add the VPN with the secret OCID, regenerate, and apply the updated network file in the same Terraform state.

See [OCI Secret Management](https://docs.oracle.com/en-us/iaas/Content/secret-management/home.htm). Protect downloaded configurations, Terraform state and raw networking outputs; they can contain keys. Keep them out of public buckets, public repositories, logs and support tickets.

&nbsp;

## 9. Deployment

This version uses **Terraform CLI with the root of Orchestrator v2.2.0**. Its pinned Resource Manager facade constrains the OCI provider to `~> 5.0`, while Networking v0.9.0 requires at least `7.27.0`. The normal pinned facade cannot initialize with both constraints. If your organization permits only that Resource Manager flow, resolve the compatibility requirement before deploying this add-on.

Use a customer-controlled checkout of the orchestrator tag, approved OCI authentication and protected Terraform state. Keep the existing two deployment phases and use the same state for both. The paths below are examples; replace them with your private generated directory.

### Update an Existing Landing Zone

1. Locate the private source configuration, current generated files and the Terraform state that already owns the landing zone. Use your approved state backup and access process.
2. Confirm that the documented orchestrator-root CLI path can use that existing state safely. If the landing zone is managed through Resource Manager and you cannot access or transition its state through an approved process, resolve that ownership/deployment issue first. Do not create another state or stack to manage the same resources.
3. Add the selected connection to the current JSON source, keeping existing hub, environment, workload and other managed resources. Regenerate into a separate private output directory and compare the new files with the current set.
4. Plan against the existing state using its complete current file set, including any workload files. Review the new connections, attachment-table assignments and routes. Investigate unexpected deletions or replacements before applying.
5. Apply the reviewed update, complete the external peer/provider work, and run the validation below. Use the phase-specific files that your generated set and existing deployment require; never load pre/final variants together.

The following commands describe the generated-file handoff for both a new deployment and a reviewed update. They do not create a separate connectivity stack.

### Apply the Generated File Set

Before planning, set the orchestrator root variables `tenancy_ocid` and `region` to your tenancy and the region used in the generated design. For API-key authentication, also supply `user_ocid`, `fingerprint` and `private_key_path` through your approved local process; `private_key_password` is optional. Terraform accepts these through `TF_VAR_<variable_name>` environment variables. Generated JSON files do not contain these deployment credentials. See the pinned [root variable definitions](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/blob/v2.2.0/variables.tf).

From the orchestrator root, initialize and plan phase 1:

```sh
terraform init
terraform plan \
  -var-file=/private/customer/lz/generated/iam.json \
  -var-file=/private/customer/lz/generated/governance.json \
  -var-file=/private/customer/lz/generated/network.json \
  -var-file=/private/customer/lz/generated/security_cis2_pre.json \
  -var-file=/private/customer/lz/generated/observability_cis2_pre.json
```

Review the plan, then apply with the same phase-1 arguments through your approved process. Complete any prerequisites needed between phases, such as secret creation or physical activation.

For phase 2, regenerate if those prerequisites changed the connection configuration, retain IAM/governance/network files and replace the temporary control files with their final variants:

```sh
terraform plan \
  -var-file=/private/customer/lz/generated/iam.json \
  -var-file=/private/customer/lz/generated/governance.json \
  -var-file=/private/customer/lz/generated/network.json \
  -var-file=/private/customer/lz/generated/security_cis2.json \
  -var-file=/private/customer/lz/generated/observability_cis2.json
```

Add generated workload files when your design includes them. For CIS1, use the corresponding `cis1` filenames. If your design produces no `_pre` files, as with Hub E, omit those phase-1 arguments and add the final controls in phase 2. Use only files present in your generated set. Never pass both the `_pre` and final file for the same configuration family, and do not pass `config.json` to Terraform.

For Hub C, follow the [firewall backend procedure](../oci-hub-models/hub_c/readme.md#backend-targets) and supply exactly one network variant. Existing landing zones use their current orchestrator state and a reviewed update plan, rather than creating a second stack for the same resources.

&nbsp;

## 10. Validation and Troubleshooting

After applying, check the connection with your network team:

1. Confirm both VPN tunnels or the required FastConnect circuits are operational.
2. Inspect each managed DRG attachment and confirm that its custom ingress table is assigned.
3. Check learned/static routes in both directions and compare them with the expected remote and local networks.
4. Check firewall policy, NSGs and security lists for the approved traffic.
5. Test an approved application flow in both directions, then test failure and recovery of redundant paths.

| Symptom | Check next |
|---|---|
| New VPN tunnel is down before the router is configured | Complete the router handover for both tunnels. OCI resource creation alone does not establish an encrypted session. |
| VPN cannot establish IKE / phase 1 | Public endpoints and connectivity, matching keys, the IKE identity expected on each side, IKE version and compatible phase 1 proposals. Behind NAT, compare the router's actual identity with the configured CPE identifier. |
| IKE works but IPSec / phase 2 fails, or the tunnel flaps on rekey | Compatible phase 2 encryption/authentication/PFS proposals and lifetimes on both peers. With GCM, authentication is included. Inspect negotiation logs rather than assuming the selected or default proposal was used. |
| BGP stays down | ASN, inside/peering address pair, VLAN, optional MD5 key and provider activation. |
| FastConnect stays pending provider activation | Complete the provider's order/activation process and give it the circuit OCID and required service details. |
| Physical link is ready but a direct circuit is down | Cross-connect activation/provisioning, VLAN and the external BGP configuration. |
| Connection is up but traffic fails | Routes in both directions, effective DRG table assignments and traffic permissions. |
| Failover does not behave as expected | Advertisements, route preference and the health of every alternate path. |
| Terraform cannot read a referenced secret | Secret existence, region and deployment principal permissions. |
| Provider initialization reports incompatible constraints | Confirm you are using the orchestrator root and the documented provider-compatible CLI path. |

&nbsp;

## 11. External Work and Responsibilities

| Required work outside this add-on | Responsible team | If it cannot be completed |
|---|---|---|
| Configure the customer router and matching VPN/BGP settings | Customer network team; provider where it owns the peer | OCI resources may exist, but the tunnels, BGP sessions or routed traffic will not work. |
| Permit approved traffic in existing firewall policy, NSGs and security lists | Customer network/security administrators | Routes exist, but those controls continue to block traffic. |
| Order and activate the provider/physical FastConnect service | Customer service owner, carrier/partner and datacenter operators | The circuit cannot become operational. A separately configured VPN can still provide a path. |
| Create referenced secrets and grant read access | Customer Vault/IAM administrators | VPN creation/update with those references fails. Use OCI-generated or inline keys only if your organization's process allows it. |
| Permit the provider-compatible Terraform CLI deployment path and existing-state access | Customer deployment/platform team | Deployment through the current pinned Resource Manager facade remains blocked. |
| Configure route preference and run redundancy tests | Customer network team with the provider where applicable | Both services can exist without the required failover behavior. |

The customer owns lifecycle, drift management and compliance review for the manual resources and configuration above.

&nbsp;

## 12. Compatibility and Current Limits

The supported path above works with today's released modules. These additional outcomes need framework changes and a compatible release before customers can rely on them:

| Desired outcome | Required framework change | Current alternative |
|---|---|---|
| Standard pinned Resource Manager deployment | Align facade and networking provider requirements, then validate the resulting release. | Use the documented orchestrator-root CLI path. |
| Automatically store supplied keys as managed secrets | Add secret creation and ordering/permission support. | Use inline keys or create secrets in the LZ Vault before referencing them. |
| Resolve Vault references for FastConnect MD5 keys | Add secret resolution for that field. | Supply the agreed literal BGP key. |
| Refer to newly prepared physical connections by configuration name | Resolve those references in the networking module and respect activation readiness. | Prepare/activate ports first, then supply their real OCIDs. |
| Change DRG-wide defaults for future unmanaged attachments | Add explicit supported service-default management. | The add-on assigns custom tables only to its managed attachments. |

This version does not support policy-based VPN, IPv6 routing, MACsec, IPsec over FastConnect, carrier ordering or customer-router automation. Do not add unrecognized configuration keys to try to enable them.

Generated VPN objects and DRG routing were validated in `eu-frankfurt-1` through Networking `v0.9.0` with OCI provider `7.27.0`, using a strongSwan/FRRouting Linux peer. Eight configuration profiles passed 219 live assertions covering bidirectional private traffic, static/BGP routing, IKEv1/IKEv2, custom cryptography, IKE identities, tunnel outages, recovery and peer-initiated rekeying.

The tests used a minimal Hub E-style fixture with two reused VMs. They did not apply a complete landing zone or validate the pinned Resource Manager facade, FastConnect activation, live Vault-secret references or hardware CPE interoperability. These functional checks do not establish a failover SLA.

An existing-VPN replacement test exposed a stale attachment binding in OCI provider `7.27.0`. When replacing a CPE recreates the VPN tunnels under the same configuration key, the affected `oci_core_drg_attachment_management` bindings require explicit replacement. An ordinary retry does not repair the stale bindings. This replacement transition remains a known limitation.

&nbsp;

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0. See [LICENSE](../../LICENSE.txt).
