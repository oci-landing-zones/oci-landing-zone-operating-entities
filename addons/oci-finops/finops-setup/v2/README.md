# FinOps V2 IAM and networking

These configurations add the FinOps platform to an existing One-OE Landing Zone using **Orchestrator v2.2.0**, IAM module **v0.3.5**, and networking module **v0.9.0**. The existing [Hub E deployment files](../README.md) remain available. The [IAM and network design](../v2-iam-network-proposal.md) explains the role boundaries and Oracle documentation behind them.

## Configuration files

| File | Purpose |
|---|---|
| [finops_iam.json](finops_iam.json) | Create `cmp-finops` under the existing shared platform compartment, three groups in `id_lz_common`, and their policies. |
| [finops_network.json](finops_network.json) | Create the FinOps VCN, private OAC/ADB/infra subnets, service gateway, security lists, two NSGs, and an attachment to the existing Hub A DRG. |
| [finops_service_access.json](finops_service_access.json) | After provisioning, enable the ADB report-reading principal and the FinOps operators' approved Database Tools connection. Replace both OCID placeholders before using this file. |

The configurations prepare infrastructure and access. Operations provisions ADB, OAC, its private access channel (PAC), Database Tools connections and credentials, and dashboard content. LZ administrators provision the Bastion and its network dependencies. All three FinOps groups can use Bastions in the shared network and FinOps compartments.

## Roles and compartment scope

| Group | FinOps compartment | Shared network compartment |
|---|---|---|
| `grp-lz-finops-admins` | Read ADB/OAC and Database Tools; use the approved reporting connection; manage Bastion resources and sessions, subject to the network dependency boundary below. | Read networking; use existing Bastions and manage sessions. |
| `grp-lz-finops-db-admins` | Manage Autonomous Database and its VNICs; read Database Tools and use connections; manage Bastion sessions. | Read networking; use VCNs/subnets/NSGs; manage private IPs and VNICs for ADB private endpoints; use Bastions and manage sessions. |
| `grp-lz-finops-oac-admins` | Manage OAC instances/PAC and VNICs; use private IPs; manage Bastion sessions. | Read networking and use VCNs/subnets/NSGs; use Bastions and manage sessions. |

ADB/OAC and Database Tools permissions target `cmp-landingzone:cmp-lz-platform:cmp-finops`. All groups have Bastion session access in that compartment and `cmp-landingzone:cmp-lz-network`. FinOps admins receive **read-only network access**, with no VCN, subnet, routing, security-list, DHCP, NSG, VNIC, or private-IP write grants. Shared Bastion administration stays with LZ administrators; FinOps admins manage Bastion resources only in `cmp-finops`.

**Bastion lifecycle boundary:** `manage bastion-family` provides Bastion permissions, but Oracle documents additional network permissions for creation and deletion. These templates intentionally do not grant those dependencies to FinOps admins. LZ administrators perform creation/deletion; FinOps admins can operate existing FinOps Bastions and sessions. Do not expand shared-network permissions to make those lifecycle operations succeed. The session grants in shared networking are compartment-wide; if that compartment hosts unrelated Bastions, constrain access to designated Bastions before deployment. [Oracle: Bastion IAM](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

**A DBA connection OCID is not required in the human policy.** DBAs can use any Database Tools connection in `cmp-finops`. Operators use a specific reporting connection so they cannot use a privileged DBA connection. Database permissions come from each connection's database account. Use resource principal runtime identity and grant each connection principal access only to its credential secret; this prerequisite is configured with the connection, outside these templates. [Oracle: connection permissions](https://docs.oracle.com/en-us/iaas/database-tools/doc/oracle-database-connections.html).

The common Bastion access is for TCP forwarding to managed-service endpoints. Add `read instance-agent-plugins` if Managed SSH to a Compute instance is introduced. Configure a client allowlist and session lifetime when creating the Bastion. OAC application roles remain separate: assign the FinOps authors and OAC administrators their agreed application roles.

For OAC private dashboard endpoint creation/changes, have LZ network administrators perform the network operation: Oracle documents broader network permissions than the PAC permissions granted to the OAC group here. PAC connectivity alone does not make the dashboard URL private. [Oracle: private endpoint requirements](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/control-incoming-and-outgoingtraffic-private-endpoint-ingress-and-egress.html).

## Existing One-OE dependencies

For a separate FinOps infrastructure stack, supply the LZ dependency outputs through the Orchestrator's **Dependencies Source**:

| Dependency | Required keys |
|---|---|
| Compartments | `CMP-LZ-PLATFORM-KEY`, `CMP-LZ-NETWORK-KEY` |
| Identity domains | `COMMON-DOMAIN`, referring to `id_lz_common` |
| Network resources / dynamic routing gateways | `DRG-FRA-LZ-HUB-KEY` |
| Network resources / DRG route tables | `DRGRT-FRA-LZ-SPOKES-KEY` |

Adapt domain/compartment names in the policies and regional names/CIDRs to the deployed LZ. Confirm existing LZ policies provide Console compartment discovery and permission to apply the required defined tags. These templates do not create a second identity domain, hub, or base LZ.

Use `finops_iam.json` and `finops_network.json` together for the infrastructure stack. Do **not** also pass the existing One-OE IAM/network configurations as extra inputs: Orchestrator v2.2.0's RMS facade selects the first occurrence of a top-level configuration key; it does not recursively merge duplicate blocks. For a single-stack deployment, merge the additions into the owning configuration before deployment.

After `cmp-finops` and the reporting connection exist, replace `<FINOPS_COMPARTMENT_OCID>` and `<FINOPS_REPORTING_CONNECTION_OCID>` in `finops_service_access.json`. The IAM module does not substitute symbolic compartment keys inside dynamic-group matching-rule strings. Apply this file through a separate service-access stack using the same identity-domain dependency, or merge its policy entries and dynamic-group configuration into the infrastructure IAM file. Do not replace the infrastructure stack's entire input list with this smaller file: that would remove resources from its configuration.

Configure the reporting connection's resource principal and credential-secret permissions before testing operator SQL access. The ADB dynamic group is a separate principal for the preserved OCI report-read endorsement. Enable the database resource principal as in the existing SQL setup.

## Private network and optional infra subnet

| Resource | CIDR | Purpose |
|---|---|---|
| FinOps VCN | `10.0.24.0/26` | Retains the existing two subnet ranges and provides room for infra. |
| OAC subnet | `10.0.24.0/28` | OAC private endpoint and PAC. |
| ADB subnet | `10.0.24.16/28` | Autonomous Database private endpoint. |
| Infra subnet | `10.0.24.32/28` | Optional Bastion and Database Tools private connectivity. |

The infra subnet is included in the JSON and is created when that configuration is applied. To omit it, remove `SN-FRA-LZ-FINOPS-INFRA-KEY`, `SL-FRA-LZ-FINOPS-INFRA-KEY`, and the `infra_*` rules in both NSGs. There is no per-subnet enable switch in this module. The high-level architecture drawing does not include infra.

Attach `NSG-FRA-LZ-FINOPS-ADB-KEY` to ADB, and `NSG-FRA-LZ-FINOPS-OAC-KEY` to the applicable OAC endpoint and PAC. Rules allow OAC to ADB on TCP 1522, infra and Hub A management (`10.0.3.0/24`) to ADB on TCP 1522/443, and those administration sources to private OAC on TCP 443. Infra's security list supplies the corresponding outbound rules because a Bastion endpoint cannot be assumed to use a workload NSG. Service subnets have only path-MTU ingress in their security list; endpoint NSGs supply application access. No unrestricted egress rule overrides those controls.

OAC and infra source rules initially use their dedicated subnet CIDRs. After provisioning, narrow them to the PAC egress IPs, Bastion private-endpoint IP, and Database Tools reverse-connection IPs as appropriate. Stateful rules allow return traffic. No SSH port is opened on ADB or OAC. ADB's HTTPS egress to regional Oracle services supports FOCUS ingestion; Operations must configure and verify `ROUTE_OUTBOUND_CONNECTIONS = 'ENFORCE_PRIVATE_ENDPOINT'` before assuming DBMS_CLOUD uses that VCN path. [Oracle: ADB private endpoints](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

Use OAC Enterprise Edition for PAC, register the ADB private DNS name, and check capacity for PAC and private dashboard endpoint together. Configure private DNS and routed client access for dashboard users. Additional on-premises client CIDRs and DNS forwarding are deployment-specific. [Oracle: PAC prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html).

## Required Hub A integration in the owning LZ stack

The FinOps attachment uses the existing spoke DRG route table, whose default route must lead to the hub attachment. The FinOps subnet route table uses `0.0.0.0/0 → DRG` and `all-services → local SGW`. Complete the following additions in the **existing LZ configuration/state**; the addon stack does not take ownership of hub route tables.

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

In `DRGRD-FRA-LZ-HUB-KEY`, add an import statement for the new attachment. Use an unused priority; `30` follows the current runtime's PROD/PREPROD priorities. For a separate addon stack, substitute the attachment OCID from its outputs:

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

For a single stack, move the FinOps attachment into the existing DRG's `drg_attachments` map, remove its `inject_into_existing_drgs` block, and use `drg_attachment_key: DRGATT-FRA-LZ-FINOPS-KEY` in this import statement. Preserve all existing routes and imports. Do not import FinOps directly into the spoke route table: that would bypass the hub inspection path. Add the required firewall policy rules for permitted FinOps traffic and verify both directions. The local service-gateway and same-VCN paths intentionally do not traverse the hub firewall.

## Validation and migration

Run the static IAM boundary regression checks from the repository root:

```sh
python3 -m unittest discover -s addons/oci-finops/finops-setup/v2/tests -v
```

These checks reject FinOps operator network writes, shared Bastion administration, and VCN topology management grants. They also check session access in shared networking and keep operator Database Tools access restricted to a specific connection.

Validation completed with two mocked Terraform plans against Orchestrator v2.2.0: the infrastructure configuration and the service-access configuration with mock OCIDs. The plans checked the three groups, one FinOps VCN, three subnets, two NSGs, and the attachment to the existing spoke DRG route table. JSON formatting, CIDR containment/overlap, local references, and role boundaries were also checked.

The V2 files use new resource keys and current One-OE names. They are not an automatic in-place migration of the older `lzp` deployment. For an existing installation, reconcile resource ownership and Terraform state before applying; do not deploy both examples into the same address space.

Validate the adapted configuration and inspect the plan for unintended replacements, missing dependencies, and unresolved placeholders. Then verify that FinOps admins cannot modify shared networking or administer shared Bastions, test LZ-admin Bastion creation/deletion and sessions as each role in both compartments, DBA connection access, denial of privileged connections to operators, OAC-to-ADB connectivity, FOCUS ingestion, and hub forward/return routing. Mocked plans verify configuration wiring, not live OCI IAM enforcement or network connectivity.
