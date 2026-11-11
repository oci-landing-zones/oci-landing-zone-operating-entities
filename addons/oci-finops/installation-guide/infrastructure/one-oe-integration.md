# One-OE network and access integration

Technical reference for [Step 1 of the FinOps setup](../README.md#step-1-provision-finops-infrastructure-and-adb). A One-OE Landing Zone is already deployed.

## Contents

- [Resource ownership and inputs](#resource-ownership-and-inputs)
- [Bastion placement and connectivity](#bastion-placement-and-connectivity)
- [Roles and compartment scope](#roles-and-compartment-scope)
- [Private network](#private-network)
- [Hub integration](#hub-integration)
- [Validation](#validation)

## Resource ownership and inputs

- Keep all new FinOps infrastructure, including ADB, in one FinOps stack.
- Consume the existing One-OE compartment, identity-domain and hub dependency outputs.
- Keep the existing hub routes, imports and shared resources in their owning LZ configuration/state.
- Do not pass complete One-OE IAM/network JSON files alongside FinOps files with duplicate top-level keys: Orchestrator v2.2.0 selects the first occurrence rather than recursively merging them.
- An existing managed resource retains its owner. Reusing a Bastion does not create another resource or state owner; transferring ownership requires a separate reviewed migration.
- Make hub additions in private deployment source configurations. Leave the repository's generic One-OE blueprints unchanged. Regenerate Blueprint Factory outputs from their source when applicable.

## Bastion placement and connectivity

The central Bastion resides in **`cmp-lz-security`**, using the existing hub management subnet in **`cmp-lz-network`**. This is the placement for this solution.

- LZ administrators manage the Bastion lifecycle; FinOps administrators manage sessions.
- Reuse a managed central Bastion or provision it with the FinOps Bastion JSON, retaining a single owner.
- The published configuration enables FQDN/SOCKS5 support and a one-hour session limit. Operators create temporary sessions with their SSH public keys.
- Use proxy-side DNS and the original private Database Actions HTTPS URL on port 443; database listener access uses its configured port and authentication.
- Verify the Bastion endpoint, private DNS, target security rules, and forward/return routes. An active session alone does not prove ADB connectivity.
- Oracle documents a same-VCN Bastion service boundary. The hub-to-FinOps cross-VCN path requires live validation; its operation is not established by the JSON configuration alone. See [Bastion Overview](https://docs.oracle.com/en-us/iaas/Content/Bastion/Concepts/bastionoverview.htm).

Existing compatibility grants for Bastion sessions in `cmp-finops` remain in the IAM JSON. They do not make that compartment a placement option for the central Bastion.

## Roles and compartment scope

| Group | FinOps compartment | Shared network compartment |
|---|---|---|
| `grp-lz-finops-db-admins` | Manage Autonomous Database and its VNICs; read Database Tools and use connections; use Bastions and manage restricted sessions. | Read networking; use VCNs/subnets/NSGs; manage private IPs and VNICs for ADB private endpoints. |
| `grp-lz-finops-oac-admins` | Manage OAC instances/PAC and VNICs; use private IPs; use Bastions and manage restricted sessions. | Read networking and use VCNs/subnets/NSGs. |

ADB/OAC and Database Tools permissions target `cmp-landingzone:cmp-lz-platform:cmp-finops`. Both policies additionally grant `use bastion`, session read/manage and work-request inspection in `cmp-landingzone:cmp-lz-security`. They do not grant Bastion access in `cmp-lz-network`. The shared-security grants allow session management across that compartment and do not restrict SOCKS5 destinations to FinOps; enforce the intended reachability with target security rules, routing and target authentication. DB/OAC administrators retain their separate private-endpoint dependencies.

**Bastion lifecycle boundary:** Both FinOps groups have `use bastion` and session permissions in shared security, plus the previous restricted grants in `cmp-finops`. LZ administrators create and delete the Bastion, including its network dependencies in `cmp-lz-network`. Neither FinOps group has `manage bastion`, so these templates do not authorize Bastion creation or deletion. Do not expand shared-network permissions to make those operations succeed. [Oracle: Bastion IAM](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

**Session visibility:** Each group has unconditional `read bastion-session` access within `cmp-finops` and `cmp-lz-security` to list and inspect sessions. Listing has no individual destination IP or session type against which to evaluate creation conditions. The read grants cover session metadata throughout those compartments; write permissions come from the separate session-management grants.

**Compatibility grants in `cmp-finops`:** In `cmp-finops`, each group's separate `manage bastion-session` statement permits TCP port forwarding to destination IPs within the FinOps VCN, `10.0.24.0/26`. Update this condition when adapting the VCN CIDR. This is a destination-IP restriction, not a VCN-OCID condition on Bastion creation. Keep network rules limited to the approved endpoint ports. Do not add an unconditional `manage bastion-family` or session write grant that bypasses the restriction; also review inherited policies and other group memberships. Oracle documents the session-type and destination-IP conditions in its [Bastion access example](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengsettingupbastion.htm). This retained local pattern targets the FinOps VCN; the central cross-VCN pattern requires the separate topology validation described above. [Oracle: creating a Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-bastion.htm).

**A DBA connection OCID is not required in the human policy.** DBAs can use any Database Tools connection in `cmp-finops`. OAC administrators are not granted Database Tools connection access by these templates. Database permissions come from each connection's database account. Use resource principal runtime identity and grant each connection principal access only to its credential secret; this prerequisite is configured with the connection, outside these templates. [Oracle: connection permissions](https://docs.oracle.com/en-us/iaas/database-tools/doc/oracle-database-connections.html).

Shared-security session grants support the central SOCKS5 workflow and are not restricted to that session type. The retained `cmp-finops` grants authorize only fixed TCP port forwarding. If Managed SSH is introduced, review the session condition, target-host scope, and `read instance-agent-plugins` permission together. Configure a client allowlist and session lifetime when creating the Bastion. OAC application roles remain separate: assign the FinOps authors and OAC administrators their agreed application roles.

For OAC private dashboard endpoint creation/changes, have LZ network administrators perform the network operation: Oracle documents broader network permissions than the PAC permissions granted to the OAC group here. PAC connectivity alone does not make the dashboard URL private. [Oracle: private endpoint requirements](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/control-incoming-and-outgoingtraffic-private-endpoint-ingress-and-egress.html).

## Private network

| Resource | CIDR | Purpose |
|---|---|---|
| FinOps VCN | `10.0.24.0/26` | Dedicated FinOps VCN. |
| OAC subnet | `10.0.24.0/28` | OAC private endpoint and PAC. |
| ADB subnet | `10.0.24.16/28` | Autonomous Database private endpoint. |
| Infra subnet | `10.0.24.32/28` | Database Tools and other private administration endpoints; the central Bastion remains in the hub management subnet. |

DNS labels follow the One-OE regional naming pattern: `vcnfralzfinops` for the VCN, and `snfrafinopsoac`, `snfrafinopsdb`, and `snfrafinopsinf` for the OAC, ADB, and infra subnets. The infra suffix is shortened to `inf` to stay within OCI's 15-character limit. The VCN domain is `vcnfralzfinops.oraclevcn.com`. Changing these labels on an existing deployment requires replacing the VCN and affected network resources; review the Terraform plan before applying.

The infra subnet is included in the JSON and is created when that configuration is applied. To omit it, remove `SN-FRA-LZ-FINOPS-INFRA-KEY`, `SL-FRA-LZ-FINOPS-INFRA-KEY`, and the `infra_*` rules in both NSGs. There is no per-subnet enable switch in this module. The high-level architecture drawing does not include infra.

Attach `NSG-FRA-LZ-FINOPS-ADB-KEY` to ADB, and `NSG-FRA-LZ-FINOPS-OAC-KEY` to the applicable OAC endpoint and PAC. Rules allow OAC to ADB on TCP 1522, infra and hub management (`10.0.1.0/24` in this example; adapt it to the selected hub) to ADB on TCP 1522/443, and those administration sources to private OAC on TCP 443. Infra's security list supplies outbound rules for administration endpoints that do not use a workload NSG. Service subnets have only path-MTU ingress in their security list; endpoint NSGs supply application access. No unrestricted egress rule overrides those controls.

OAC and infra source rules initially use their dedicated subnet CIDRs. After provisioning, narrow them to the PAC egress IPs, Bastion private-endpoint IP, and Database Tools reverse-connection IPs as appropriate. Stateful rules allow return traffic. No SSH port is opened on ADB or OAC. ADB's HTTPS egress to regional Oracle services supports FOCUS ingestion; Operations must configure and verify `ROUTE_OUTBOUND_CONNECTIONS = 'ENFORCE_PRIVATE_ENDPOINT'` before assuming DBMS_CLOUD uses that VCN path. [Oracle: ADB private endpoints](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

Use OAC Enterprise Edition for PAC, register the ADB private DNS name, and check capacity for PAC and private dashboard endpoint together. Configure private DNS and routed client access for dashboard users. Additional on-premises client CIDRs and DNS forwarding are deployment-specific. [Oracle: PAC prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html).

## Hub integration

The hub already belongs to the Landing Zone. Add the FinOps routes and attachment import to its private source configuration, preserving existing routes and imports. Use the complete resulting network configuration in the hub-owning stack; do not add another input with a duplicate top-level `network_configuration` block.

### Hub E routing

For Hub E, add `10.0.24.0/26 → DRG-FRA-LZ-HUB-KEY` to `RT-FRA-LZ-HUB-MGMT-KEY` and import the FinOps attachment into `DRGRD-FRA-LZ-HUB-KEY` using the statement below. The published Hub E spoke table key is `DRGRT-FRA-LZ-SPOKE-KEY`; adapt the FinOps attachment dependency accordingly. Its existing hub-return routes must include the management subnet. The example administration source is `10.0.1.0/24`; for the published Hub A shape, adapt it to `10.0.3.0/24`.

Add this entry to the private configuration's existing `RT-FRA-LZ-HUB-MGMT-KEY.route_rules` map:

```json
"rr-fra-finops": {
    "description": "Route from hub management to the FinOps VCN through the DRG.",
    "destination": "10.0.24.0/26",
    "destination_type": "CIDR_BLOCK",
    "network_entity_key": "DRG-FRA-LZ-HUB-KEY"
}
```

Adapt the destination to the actual FinOps VCN CIDR. Confirm the DRG table associated with the hub attachment learns the FinOps subnets, and that the FinOps attachment's table has return routes to the hub management subnet. The subnet route alone is insufficient.

### Hub A routing

For Hub A, preserve firewall inspection using the following integration. The FinOps attachment uses the existing spoke DRG route table, whose default route must lead to the hub attachment. The FinOps subnet route table uses `0.0.0.0/0 → DRG` and `all-services → local SGW`. Complete the following additions in the **existing LZ configuration/state**; the addon stack does not take ownership of hub route tables.

Add a `rr-fra-finops` rule for `10.0.24.0/26` to these hub VCN route tables:

| Existing route table | Target field and value |
|---|---|
| `RT-FRA-LZ-HUB-INGRESS-KEY` | `network_entity_id: NFW-FRA-LZ-HUB-INT-KEY` |
| `RT-FRA-LZ-HUB-NATGW-KEY` | `network_entity_id: NFW-FRA-LZ-HUB-INT-KEY` |
| `RT-FRA-LZ-HUB-FW-INT-KEY` | `network_entity_key: DRG-FRA-LZ-HUB-KEY` |
| `RT-FRA-LZ-HUB-MGMT-KEY` | `network_entity_key: DRG-FRA-LZ-HUB-KEY` |

For the first two tables, add this object to the existing `route_rules` map:

```json
"rr-fra-finops": {
    "description": "Route to the FinOps VCN through the internal firewall.",
    "destination": "10.0.24.0/26",
    "destination_type": "CIDR_BLOCK",
    "network_entity_id": "NFW-FRA-LZ-HUB-INT-KEY"
}
```

For the last two, use the same destination with `network_entity_key: DRG-FRA-LZ-HUB-KEY` instead of `network_entity_id`, and describe the route as going through the DRG. If the hub LB is used to reach FinOps, add the DRG-targeted route to `RT-FRA-LZ-HUB-LB-KEY` as well; no FinOps LB backend is created here.

### FinOps attachment import

For either hub, in the private configuration's `DRGRD-FRA-LZ-HUB-KEY`, add an import statement for the new attachment. Use an unused priority; `30` follows the current runtime's PROD/PREPROD priorities. Use the attachment OCID exported by the FinOps stack:

```json
"ROUTE-TO-VCN-FINOPS-KEY": {
    "action": "ACCEPT",
    "priority": 30,
    "match_criteria": {
        "match_type": "DRG_ATTACHMENT_ID",
        "attachment_type": "VCN",
        "drg_attachment_id": "<FINOPS_DRG_ATTACHMENT_OCID>"
    }
}
```

The FinOps stack owns the attachment; the existing hub stack owns its route tables and imports. Preserve all existing routes and imports. For firewalled hubs, do not import FinOps directly into the spoke route table: that would bypass the hub inspection path. Add the required firewall policy rules for permitted FinOps traffic and verify both directions. The local service-gateway and same-VCN paths intentionally do not traverse the hub firewall.

## Validation

| Area | Check |
| --- | --- |
| Terraform ownership | Plans retain existing LZ resources and show only intended changes; no duplicate resource owner or unresolved placeholder. |
| IAM | Verify both permitted and denied operations for the DB and OAC roles. Neither role manages shared VCN topology or Bastion lifecycle through these policies. |
| Bastion | Verify source allowlist, session creation/list/get/delete, DNS, endpoint access, denied destinations and expiry. |
| Network | Verify forward/return routing, security rules and firewall inspection for the selected hub. |
| Database | Verify ADB private connectivity and Database Tools connection access where configured. |
| OAC | Verify PAC and dashboard access separately when OAC is configured in Step 4. |

Static configuration and Terraform plans do not establish live OCI authorization or network connectivity.
