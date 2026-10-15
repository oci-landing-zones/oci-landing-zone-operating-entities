# FinOps V2: IAM and network proposal

**Status: proposed for review. No IAM, networking, Terraform, or SQL configuration has been changed.**

Baseline: Operating Entities commit `c1e74ba`, the existing FinOps addon, and the [One-OE Hub A runtime](../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.json). The current runtime references Orchestrator **v2.2.0**. This proposal enhances the addon; it does not replace its FOCUS ingestion pipeline.

## 1. Three roles with distinct responsibilities

| Group | Policy name | Intended capability |
|---|---|---|
| `grp-lz-finops-admins` | `pcy-lz-finops-admins` | View ADB and OAC resources, query approved FinOps data through SQL Worksheet, and create FinOps dashboards through OAC application permissions. |
| `grp-lz-finops-db-admins` | `pcy-lz-finops-db-admins` | Administer Autonomous Database, including lifecycle, backup, and private-endpoint operations. |
| `grp-lz-finops-oac-admins` | `pcy-lz-finops-oac-admins` | Administer OAC instances and their private access channel; administer the OAC application through a separate application-role assignment. |

All three groups can operate sessions on a pre-created FinOps Bastion. They do not need permission to create or delete the Bastion service itself.

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

If DBAs will use Console SQL Worksheet, give them `read database-tools-family` plus `use database-tools-connections` restricted to a **separate DBA connection OCID**, following the operations example. Connection/private-endpoint creation and credential provisioning can remain with the LZ deployment administrator. This avoids granting every DBA broad secret-management permissions merely to run SQL.

### OAC administration policy

```text
Allow group 'id_lz_common'/'grp-lz-finops-oac-admins' to manage analytics-instances in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'grp-lz-finops-oac-admins' to read analytics-instance-work-requests in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
```

These cover instance lifecycle, scaling, and private-access-channel operations, including instance deletion. Work-request read access provides progress and failure diagnostics without permission to delete work requests. A FinOps operator's read-only instance access does not include all PAC inspection APIs: Oracle requires `ANALYTICS_INSTANCE_MANAGE` even for `GetPrivateAccessChannel`. [Oracle: OAC IAM permissions](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/permissions-manage-analytics-cloud-instances.html).

Map OAC administrators to **BI Service Administrator** inside OAC. This role also grants broad access within the analytics application; it should be assigned to the people responsible for that application, not automatically to all FinOps users. [Oracle: OAC application roles](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/predefined-application-roles.html).

### Common Bastion statements

Append this block to each of the three policies, replacing `<GROUP>` with its group name. It assumes the Bastion and its target networking are in `cmp-finops`; section 3 explains the shared-network alternative.

```text
Allow group 'id_lz_common'/'<GROUP>' to use bastion in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to manage bastion-session in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read instances in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read vcns in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read subnets in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read vnic-attachments in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
Allow group 'id_lz_common'/'<GROUP>' to read vnics in compartment cmp-landingzone:cmp-lz-platform:cmp-finops
```

The supporting reads follow Oracle's `CreateSession` permission table. Use TCP port forwarding for ADB. Add `read instance-agent-plugins` only for Managed SSH to a Compute host. Session management is compartment-wide, not restricted to sessions created by the same user. Bastion allowlists, session expiry, and target NSGs provide additional controls. [Oracle: Bastion IAM](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

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

## 3. Resolve the compartment boundary before implementing JSON

The current addon and the supplied architecture put the **VCN/subnets in shared networking**, while ADB, OAC, and the existing database NSG are in the **FinOps platform compartment**. A policy mentioning only `cmp-finops` cannot authorize use of a subnet owned by `cmp-lz-network`.

| Choice | Effect | Recommendation |
|---|---|---|
| Preserve the One-OE shared-network placement | Allow the specific network dependencies below in the owning shared-network compartment; keep ADB, OAC, connection, and Bastion permissions in `cmp-finops`. | Best match for the supplied architecture and the requested minimal changes, **if the network-scope exception is approved**. |
| Enforce literal FinOps-only scope | Place the dedicated FinOps VCN, subnets, NSGs, Bastion, and Database Tools endpoint in `cmp-finops`. LZ network administrators retain ownership of shared hub/DRG configuration. | Satisfies the strict scope requirement but changes the current architecture. Do not move existing resources implicitly. |

The exported architecture retains the supplied shared-network placement. Neither choice is implemented by this proposal.

### Private-endpoint dependency statements

Each row means `Allow group 'id_lz_common'/'<GROUP>' to <verb/resource> in compartment <owning compartment>`. Expand it after the placement decision; these are actual permissions, not new JSON fields.

| Group | Verb / resource | Owning compartment |
|---|---|---|
| DB administrators | `use vcns`; `use subnets`; `manage private-ips` | VCN/subnet compartment |
| DB administrators | `manage vnics` | Both VCN and database compartments; one statement if colocated |
| DB administrators | `use network-security-groups` | ADB NSG compartment |
| OAC administrators, for PAC | `read virtual-network-family`; `use subnets` | VCN/subnet compartment |
| OAC administrators, for PAC | `manage vnics`; `use private-ips` | OAC instance compartment |
| OAC administrators, for PAC | `use network-security-groups` | PAC NSG compartment |
| All three, for Bastion | Network reads from the common block | Actual VCN, subnet, and VNIC compartments |

These follow [ADB private-endpoint permissions](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html) and [OAC's limited PAC policy](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html). Compartment-wide network grants can affect other networks in that compartment; they are not automatically restricted to the FinOps VCN.

**OAC private dashboard endpoint:** the PAC connects OAC to data sources; it does not make the dashboard URL private. For private dashboard endpoint changes, Oracle additionally documents `manage virtual-network-family`. Keep those network changes with LZ network administrators unless broader network administration for the OAC group is explicitly approved. Do not claim the narrower PAC permissions cover every private-endpoint operation. [Oracle: private endpoint IAM requirements](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/control-incoming-and-outgoingtraffic-private-endpoint-ingress-and-egress.html).

Use the existing LZ discovery policies for Console compartment and identity-domain selection. Oracle's PAC procedure includes tenancy-level compartment read access. Do not silently add tenancy-wide discovery permissions to these three policies; verify existing access during implementation.

## 4. Hub A routing changes

The existing FinOps VCN is **`10.0.24.0/27`**, with two `/28` subnets. Preserve these addresses unless capacity or overlap checks require a change. Rename the app subnet's display name to identify its OAC purpose after approval.

| Finding in the existing addon | Proposed change | Reason |
|---|---|---|
| FinOps route table sends only `10.0.0.0/21` to DRG. | Follow Hub A: default route to DRG, regional Oracle services route to the local SGW. | Provides the hub path for approved nonlocal destinations while retaining the service route. |
| Hub management table has PROD/PREPROD routes but no `10.0.24.0/27` route. | Add the FinOps prefix to the applicable hub route tables. | Hub management traffic otherwise follows the default NAT path rather than returning to FinOps. |
| Existing DRG configuration follows Hub E. | Attach FinOps to the Hub A spoke DRG route table; add FinOps to the hub import distribution. Retain the spoke default route through the hub. | Prevents a direct spoke import from bypassing the Hub A inspection path. |
| Hub A tables enumerate existing spoke prefixes. | Add FinOps to the hub ingress, internal-firewall, NAT return, and management routes; include LB routes only if that path is used. | Preserves symmetric routing through the internal firewall for the selected traffic paths. |
| The addon includes a complete hub and unrelated load-balancer backend examples. | Integrate FinOps with the existing Hub A by referencing its outputs/keys. | Avoids creating another hub or altering unrelated workloads. Preserve the previous Hub E reference when reorganizing examples. |

Use the current runtime's symbolic firewall targets, such as `NFW-FRA-LZ-HUB-INT-KEY`, rather than introducing an older manual firewall-IP staging step. Reference: [Hub A runtime](../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_a.json).

Hub A's local SGW route intentionally avoids the hub firewall for matching Oracle Services Network traffic. OAC-to-ADB traffic within the same VCN also stays local. Apply NSGs to those paths; do not describe all FinOps traffic as hub-inspected. Firewall allow rules must accompany the routes for traffic that does traverse the hub.

### Dedicated endpoint NSGs

Proposed names: **`nsg-<region>-lz-finops-adb`** and **`nsg-<region>-lz-finops-oac`**. Use stateful rules and the selected connection mode.

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

The current security list allows unrestricted egress, and the current database NSG allows TCP egress anywhere. Tightening only a new NSG will not restrict traffic already allowed by another applicable security rule. Review the combined rules and remove unnecessary broad egress and the inherited SSH ingress from these managed-service subnets as part of the approved network change. [Oracle: NSG and security-list interaction](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/networksecuritygroups.htm).

PAC requires **OAC Enterprise Edition**, at least four available subnet IP addresses, and registration of the ADB private hostname/DNS zone. A private dashboard endpoint additionally needs client-side private DNS resolution and connectivity. Verify capacity for OAC, ADB, Bastion, and Database Tools before reserving endpoints in the two `/28` subnets. [Oracle: PAC prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html).

ADB private ingress does not by itself force DBMS_CLOUD egress through the VCN. Operations should validate `ROUTE_OUTBOUND_CONNECTIONS = 'ENFORCE_PRIVATE_ENDPOINT'` for the selected database version and pipeline; Oracle recommends it to include DBMS_CLOUD outbound connections in private-endpoint enforcement. Confirm successful FOCUS ingestion before treating the SGW/NSG path as enforced. [Oracle: outbound connections from ADB private endpoints](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

## 5. Decisions and validation before JSON implementation

1. **Compartment placement:** shared-network dependencies as a documented exception, or dedicated networking inside `cmp-finops` for literal scope isolation.
2. **OAC access:** private dashboard endpoint recommended for the LZ baseline; Enterprise Edition with PAC for ADB. Confirm dashboard audience connectivity before selecting a private endpoint.
3. **Operator SQL privileges:** reporting access by default; confirm any pipeline-control operations. Use separate operator and DBA connections.
4. **Network ownership:** LZ administrators provision networks, NSGs, Bastion, and developer connectivity; service administrators operate ADB/OAC with the scoped dependencies above.

After approval, update JSON using the current One-OE domain-qualified groups, symbolic references, and dependency outputs. Preserve the existing ADB report-read endorsement. Treat changed Terraform resource keys and compartment ownership as migration decisions; review the plan for replacement before applying to an existing installation.

Validation must include: configuration/schema checks against the pinned orchestrator; a plan with no unintended hub or workload replacement; role tests for allowed operations and denied access outside scope; separate operator/DBA SQL connections; OAC-to-ADB connectivity; Bastion forwarding; and forward/return routing through Hub A. The policies above are documentation-reviewed proposals, not a claim of live tenancy validation.
