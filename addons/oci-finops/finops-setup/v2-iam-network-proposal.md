# FinOps V2: IAM and network proposal

**Status: IAM and network decisions incorporated in the [V2 configurations](v2/README.md). No tenancy deployment has been performed.**

Baseline: Operating Entities commit `c1e74ba`, the existing FinOps addon, and the [One-OE Hub A runtime](../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.json). The current runtime references Orchestrator **v2.2.0**. This proposal enhances the addon; it does not replace its FOCUS ingestion pipeline.

## 1. Three roles with distinct responsibilities

| Group | Policy name | Intended capability |
|---|---|---|
| `grp-lz-finops-admins` | `pcy-lz-finops-admins` | View ADB and OAC resources, query approved FinOps data through SQL Worksheet, and create FinOps dashboards through OAC application permissions. |
| `grp-lz-finops-db-admins` | `pcy-lz-finops-db-admins` | Administer Autonomous Database, including lifecycle, backup, and private-endpoint operations. |
| `grp-lz-finops-oac-admins` | `pcy-lz-finops-oac-admins` | Administer OAC instances and their private access channel; administer the OAC application through a separate application-role assignment. |

FinOps admins have Bastion management permission in `cmp-finops`. All three groups can use Bastions and manage restricted sessions only in `cmp-finops`; these policies grant no Bastion access in `cmp-lz-network`. Networking stays with LZ administrators. Bastion creation/deletion also require network permissions, so those operations remain with LZ administrators under the current network boundary.

Use the existing One-OE identity domain, **`id_lz_common`**, and the target compartment **`cmp-landingzone:cmp-lz-platform:cmp-finops`**. Adapt these names to an existing deployment. Policy attachment can remain at tenancy root, consistent with the current runtime; each statement below explicitly limits its resource scope. Root attachment does not make a compartment-scoped statement tenancy-wide.

### FinOps operations policy

```text
Allow group 'id_lz_common'/'grp-lz-finops-admins' to read autonomous-database-family in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'grp-lz-finops-admins' to read analytics-instances in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'grp-lz-finops-admins' to read analytics-instance-work-requests in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'grp-lz-finops-admins' to read database-tools-family in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'grp-lz-finops-admins' to use database-tools-connections in compartment cmp-landingzone:cmp-lz-platform:cmp-finops where target.resource.id = '<FINOPS_REPORTING_CONNECTION_OCID>'
```

Create a Database Tools connection using **resource principal runtime identity**, backed by a database account with approved FinOps privileges. Grant that connection principal access only to its credential secret. The operator can use the connection without receiving permission to read secret values. Unconditional `read database-tools-family` also provides the connection discovery needed by SQL Worksheet. This is distinct from ADB's resource principal for fetching FOCUS reports. [Oracle: Database Tools connection permissions](https://docs.oracle.com/en-us/iaas/database-tools/doc/oracle-database-connections.html).

Default SQL access should query reporting views. If operators need to start or inspect the ingestion pipeline, Operations should define the necessary database grants or controlled procedures. OCI `read autonomous-database-family` does not itself grant SQL access, and sharing the ADB ADMIN account is unnecessary.

Map the FinOps group to **DV Content Author** in OAC for workbook, dataset, and dashboard authoring. Add **BI Data Model Author** only if the team maintains semantic models. These application roles are separate from OCI policies. [Oracle: OAC application roles](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/predefined-application-roles.html).

### Database administration policy

```text
Allow group 'id_lz_common'/'grp-lz-finops-db-admins' to manage autonomous-database-family in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
```

This includes destructive database lifecycle operations, as expected for the DBA role. Add the private-endpoint dependencies in section 3 and the common Bastion block below. Database user administration remains a database privilege; the OCI policy does not establish a SQL login.

For Console SQL Worksheet, DBAs receive `read database-tools-family` plus `use database-tools-connections` in `cmp-finops`, **without a connection OCID condition**. They can therefore use all connections in that compartment. Keep the operator connection restriction above to prevent operator use of a privileged DBA connection. Connection/private-endpoint creation and credential provisioning remain with the deployment administrator.

### OAC administration policy

```text
Allow group 'id_lz_common'/'grp-lz-finops-oac-admins' to manage analytics-instances in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'grp-lz-finops-oac-admins' to read analytics-instance-work-requests in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
```

These cover instance lifecycle, scaling, and private-access-channel operations, including instance deletion. Work-request read access provides progress and failure diagnostics without permission to delete work requests. A FinOps operator's read-only instance access does not include all PAC inspection APIs: Oracle requires `ANALYTICS_INSTANCE_MANAGE` even for `GetPrivateAccessChannel`. [Oracle: OAC IAM permissions](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/permissions-manage-analytics-cloud-instances.html).

Map OAC administrators to **BI Service Administrator** inside OAC. This role also grants broad access within the analytics application; it should be assigned to the people responsible for that application, not automatically to all FinOps users. [Oracle: OAC application roles](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/predefined-application-roles.html).

### Common Bastion statements

DB and OAC administrators use the following session block. For FinOps admins, replace `use bastion` with `manage bastion` in the first statement; retain the separate restricted session statement. Supporting VCN/subnet reads target shared networking; service VNIC reads target `cmp-finops`. The JSON uses `read virtual-network-family` in the network compartment to include the corresponding reads.

```text
Allow group 'id_lz_common'/'<GROUP>' to use bastion in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to manage bastion-session in compartment cmp-landingzone:cmp-lz-platform:cmp-finops where ALL {target.bastion-session.type = 'port_forwarding', target.bastion-session.ip in ['10.0.24.0/26']}
Allow group 'id_lz_common'/'<GROUP>' to read instances in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read vcns in compartment cmp-landingzone:cmp-lz-network
Allow group 'id_lz_common'/'<GROUP>' to read subnets in compartment cmp-landingzone:cmp-lz-network
Allow group 'id_lz_common'/'<GROUP>' to read vnic-attachments in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read vnics in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
```

The supporting reads follow Oracle's `CreateSession` permission table. Session access covers qualifying sessions in `cmp-finops`, not only sessions created by the same user. The condition restricts the session type and destination IP range; it does not constrain Bastion creation to a VCN OCID. Update the range when adapting the FinOps VCN. Do not add unconditional session or `manage bastion-family` grants that bypass this condition. Review inherited policies and other group memberships as well. Oracle documents these conditions in its [Bastion session restriction example](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengsettingupbastion.htm).

The Bastion belongs to `cmp-finops` and targets the FinOps VCN's infra subnet in `cmp-lz-network`. A Bastion is associated with one VCN; the subnet's compartment does not determine the Bastion's compartment. [Oracle: creating a Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-bastion.htm). Client allowlists, session expiry, and target NSGs provide additional controls. Managed SSH would require a reviewed change to the session restriction and the additional instance-agent-plugin read permission. [Oracle: Bastion IAM](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

## 2. Developer access and service principals

| Requirement | Proposed provision | Reason |
|---|---|---|
| SQL Worksheet in OCI Console | Database Tools private endpoint and a pre-created, role-specific connection in `cmp-finops`. | Browser-based SQL Worksheet needs a path to the private ADB; a Bastion session alone does not provide that path. |
| SQLcl / SQL Developer desktop | Bastion TCP forwarding and a separately authorized database account. | Reuses controlled access without a public database endpoint or a permanent jump server. |
| FOCUS collection | Preserve the existing ADB resource principal and cross-tenancy report-read endorsement. | Reporting objects are in Oracle's reporting tenancy; this service policy cannot be replaced by a grant only in `cmp-finops`. |
| Optional multi-cloud bucket | Separate ingestion principal writes the named bucket; ADB reads that bucket. | No need to give all three human groups blanket Object Storage administration. |

Configure the Database Tools reverse-connection IPs and Bastion private-endpoint IP in the ADB NSG. [Oracle: Database Tools private connectivity](https://docs.oracle.com/en-us/iaas/database-tools/doc/best-practices-using.html).

Do not carry forward blanket `manage vaults`, `manage secret-family`, or `manage data-safe-family` in every human role. Those are separate responsibilities. Add narrowly scoped secret rotation, customer-managed-key, or Data Safe permissions only when the agreed operating procedure requires them. Similarly, Cloud Shell is not a prerequisite for the SQL Worksheet and desktop-client paths proposed here.

Keep the business tags in `tgns-finops` separate from the One-OE `tagns-lz-role` authorization tags. Financial ownership values must not unintentionally confer IAM administration rights.

## 3. Agreed compartment boundary

The **VCN, subnets, and both endpoint NSGs are in `cmp-lz-network`**. ADB, OAC, Database Tools, and Bastion resources are in `cmp-finops`. These policies grant no access to Bastions in the network compartment. DB/OAC administrators use the shared networking through the dependencies below. This follows the existing addon's cross-compartment policy pattern while separating service responsibilities.

FinOps admins receive read-only network access. They cannot change the shared VCNs, subnets, routing, security lists, DHCP options, NSGs, VNICs, or private IPs through these policies. LZ administrators own those resources. Oracle documents extra network permissions for Bastion creation/deletion; those dependencies are intentionally excluded, so `manage bastion` alone must not be presented as sufficient for those operations. Moving Bastion ownership to `cmp-finops` does not remove its shared-subnet dependencies. FinOps self-service Bastion creation/deletion remains unavailable under these grants; LZ administrators perform those operations.

The DBA and OAC endpoint dependencies below remain service-specific. In particular, DBA private-IP/VNIC grants are compartment-wide and are not automatically isolated to FinOps endpoints. If that delegation is unsuitable in the target shared network compartment, LZ administrators must own the endpoint network operations or the resources must be isolated before deployment.

### Private-endpoint dependency statements

Each row means `Allow group 'id_lz_common'/'<GROUP>' to <verb/resource> in compartment <owning compartment>`. These dependencies are implemented in the V2 IAM file.

| Group | Verb / resource | Owning compartment |
|---|---|---|
| DB administrators | `use vcns`; `use subnets`; `manage private-ips` | VCN/subnet compartment |
| DB administrators | `manage vnics` | Both VCN and database compartments; one statement if colocated |
| DB administrators | `use network-security-groups` | Shared network compartment |
| OAC administrators, for PAC | `read virtual-network-family`; `use subnets` | VCN/subnet compartment |
| OAC administrators, for PAC | `manage vnics`; `use private-ips` | OAC instance compartment |
| OAC administrators, for PAC | `use network-security-groups` | Shared network compartment |
| All three, for Bastion | Network reads from the common block | Actual VCN, subnet, and VNIC compartments |

These follow [ADB private-endpoint permissions](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html) and [OAC's limited PAC policy](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html). Compartment-wide network grants can affect other networks in that compartment; they are not automatically restricted to the FinOps VCN.

**OAC private dashboard endpoint:** the PAC connects OAC to data sources; it does not make the dashboard URL private. For private dashboard endpoint changes, Oracle additionally documents `manage virtual-network-family`. Keep those network changes with LZ network administrators unless broader network administration for the OAC group is explicitly approved. Do not claim the narrower PAC permissions cover every private-endpoint operation. [Oracle: private endpoint IAM requirements](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/control-incoming-and-outgoingtraffic-private-endpoint-ingress-and-egress.html).

Use the existing LZ discovery policies for Console compartment and identity-domain selection. Oracle's PAC procedure includes tenancy-level compartment read access. Do not silently add tenancy-wide discovery permissions to these three policies; verify existing access during implementation.

## 4. Hub A routing changes

The V2 FinOps VCN is **`10.0.24.0/26`**. It preserves OAC at `10.0.24.0/28` and ADB at `10.0.24.16/28`, and adds optional infra at **`10.0.24.32/28`** for Bastion and Database Tools. The previous `/27` was fully occupied. The infra subnet is included in JSON, with explicit omission instructions, and is not added to the architecture drawing.

| Finding in the existing addon | Proposed change | Reason |
|---|---|---|
| FinOps route table sends only `10.0.0.0/21` to DRG. | Follow Hub A: default route to DRG, regional Oracle services route to the local SGW. | Provides the hub path for approved nonlocal destinations while retaining the service route. |
| Hub management table has PROD/PREPROD routes but no `10.0.24.0/26` route. | Add the FinOps prefix to the applicable hub route tables. | Hub management traffic otherwise follows the default NAT path rather than returning to FinOps. |
| Existing DRG configuration follows Hub E. | Attach FinOps to the Hub A spoke DRG route table; add FinOps to the hub import distribution. Retain the spoke default route through the hub. | Prevents a direct spoke import from bypassing the Hub A inspection path. |
| Hub A tables enumerate existing spoke prefixes. | Add FinOps to the hub ingress, internal-firewall, NAT return, and management routes; include LB routes only if that path is used. | Preserves symmetric routing through the internal firewall for the selected traffic paths. |
| The addon includes a complete hub and unrelated load-balancer backend examples. | Integrate FinOps with the existing Hub A by referencing its outputs/keys. | Avoids creating another hub or altering unrelated workloads. Preserve the previous Hub E reference when reorganizing examples. |

Use the current runtime's symbolic firewall targets, such as `NFW-FRA-LZ-HUB-INT-KEY`, rather than introducing an older manual firewall-IP staging step. Reference: [Hub A runtime](../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.json).

Hub A's local SGW route intentionally avoids the hub firewall for matching Oracle Services Network traffic. OAC-to-ADB traffic within the same VCN also stays local. Apply NSGs to those paths; do not describe all FinOps traffic as hub-inspected. Firewall allow rules must accompany the routes for traffic that does traverse the hub.

### Dedicated endpoint NSGs

Implemented NSGs: **`nsg-fra-lz-finops-adb`** and **`nsg-fra-lz-finops-oac`**. The template allows the dedicated OAC/infra subnet sources and Hub A management CIDR on the required ports; narrow the sources to endpoint IPs after provisioning. Infra has corresponding egress rules in its security list. All application rules are stateful.

| NSG / direction | Source → destination | Port | Purpose |
|---|---|---|---|
| ADB ingress | OAC PAC egress IPs → ADB | TCP 1522 | mTLS database connection. Use same-VCN NSG references where supported by the attached endpoint configuration. |
| OAC egress | OAC PAC → ADB private endpoint | TCP 1522 | Corresponding outbound database connection. |
| ADB ingress | Database Tools' two reverse-connection source IPs, each `/32` → ADB | TCP 1522 | Console SQL Worksheet. |
| ADB ingress | FinOps Bastion private-endpoint IP `/32` → ADB | TCP 1522 | SQLcl / SQL Developer through TCP forwarding. |
| ADB ingress, if Database Actions is required | Approved private administrator CIDRs → ADB | TCP 443 | Database Actions / ORDS. |
| OAC ingress, when dashboard endpoint is private | Approved on-premises or administrator CIDRs → OAC | TCP 443 | Dashboard access through the approved private network path. |
| ADB egress, when DBMS_CLOUD uses the private endpoint | ADB → regional Object Storage service CIDR | TCP 443 | Fetch FOCUS data over the SGW path. |

Oracle documents port 1522 for mTLS; TLS can use 1521 or 1522. Do not open both automatically. Port 443 is needed for Database Actions when that access is required. [Oracle: ADB network access](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

The legacy security list allows unrestricted egress, and its database NSG allows TCP egress anywhere. The V2 configuration omits that broad egress and the inherited SSH ingress on managed-service subnets. When adapting an existing installation, review every attached security list and NSG: an older permissive rule can still allow traffic restricted by the new NSG. [Oracle: NSG and security-list interaction](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/networksecuritygroups.htm).

PAC requires **OAC Enterprise Edition**, at least four available subnet IP addresses, and registration of the ADB private hostname/DNS zone. A private dashboard endpoint additionally needs client-side private DNS resolution and connectivity. Verify endpoint capacity across the OAC, ADB, and optional infra `/28` subnets before provisioning. [Oracle: PAC prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html).

ADB private ingress does not by itself force DBMS_CLOUD egress through the VCN. Operations should validate `ROUTE_OUTBOUND_CONNECTIONS = 'ENFORCE_PRIVATE_ENDPOINT'` for the selected database version and pipeline; Oracle recommends it to include DBMS_CLOUD outbound connections in private-endpoint enforcement. Confirm successful FOCUS ingestion before treating the SGW/NSG path as enforced. [Oracle: outbound connections from ADB private endpoints](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

## 5. Implementation and validation

The [V2 configuration guide](v2/README.md) lists the dependency outputs, optional subnet handling, and exact Hub A return-route/import additions. The FinOps stack creates only its VCN and attachment; hub changes remain in the LZ stack that owns those resources. The existing Hub E example and SQL pipeline remain available.

The IAM template creates the agreed three groups and policies. A separate post-provisioning access file preserves the ADB report-read endorsement and restricts operators to their reporting connection. It requires the actual FinOps compartment and reporting connection OCIDs; the IAM module does not resolve symbolic keys inside dynamic-group matching rules. The guide explains separate-stack use and safe merging of policy maps, since the RMS facade does not deep-merge duplicate configuration blocks.

JSON formatting and mocked Terraform plans are checked against Orchestrator v2.2.0. Live validation must still verify role permissions, Bastion lifecycle and sessions, operator/DBA connection separation, OAC-to-ADB connectivity, FOCUS ingestion, and Hub A forward/return routing. New resource keys and compartment ownership require state/migration review for an existing installation.
