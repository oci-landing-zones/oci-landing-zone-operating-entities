# OCI FinOps Setup Guide

This guide covers the complete setup of the OCI FinOps add-on: provisioning Landing Zone resources and ADB, preparing database credentials, installing the database modules, and configuring OAC.

## Prerequisites

To deploy the OCI FinOps addon, it is recommended to start with an Oracle recommended Foundational Landing Zone such as a [CIS landing zone](https://github.com/oci-landing-zones/oci-cis-landingzone-quickstart), [OCI Core Landing Zone](https://github.com/oci-landing-zones/terraform-oci-core-landingzone) or [OCI Operating Entities Landing Zone](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/).

## Setup steps

Complete the following steps in order:

1. [Provision the Landing Zone infrastructure](#step-1-setup-one-oe-landing-zone-with-finops-v2) using the JSON configurations and Terraform-based Orchestrator.
2. [Create the Autonomous Database](#step-2-create-autonomous-database).
3. [Change the initial ADMIN password and prepare the Secrets](#step-3-prepare-database-credentials-and-secrets).
4. [Install the FinOps database modules](#step-4-install-the-finops-database-modules) using Python or direct SQL.
5. [Configure OAC and its reporting content](#step-5-oracle-analytics-cloud-dashboard).

Infrastructure provisioning does not install the database modules or create the password Secrets. Complete the credential preparation in [Step 3](#step-3-prepare-database-credentials-and-secrets) before starting either installation route.

## Step 1: Setup One-OE Landing Zone with FinOps V2

The core IAM and network files prepare infrastructure and access. The optional Bastion configuration adds managed access to private FinOps endpoints. Autonomous Database deployment is covered in Step 2; Oracle Analytics Cloud is configured separately.

Prefer OCI Resource Manager with customer-controlled private Object Storage and a pinned Orchestrator version. Terraform CLI remains a supported alternative. Review the dependencies, network integration, and validation requirements below before applying.

The published V2 network configuration targets Hub A, including its management subnet `10.0.3.0/24`. Adapt a deployment copy to the selected hub topology and complete the required hub routing in the owning Landing Zone stack. For Hub E, verify the actual management subnet; the standard published blueprint uses `10.0.1.0/24`.

These configurations add the FinOps platform to an existing One-OE Landing Zone using **Orchestrator v2.2.0**, IAM module **v0.3.5**, and networking module **v0.9.0**.

### Configuration files

| File | Purpose |
|---|---|
| [finops_iam.json](deployment/finops_iam.json) | Create `cmp-finops`, two administrator groups and their policies, plus the ADB dynamic group and resource-principal policy. Resolve the compartment and ADB OCIDs in the final deployment copy; see the staged IAM setup below. |
| [finops_network.json](deployment/finops_network.json) | Create the FinOps VCN, private OAC/ADB/infra subnets, service gateway, security lists, two NSGs, and an attachment to the existing Hub A DRG. |
| [finops_bastion.json](deployment/finops_bastion.json) | Optionally create the shared-security OCI Bastion in the hub management subnet, with FQDN/SOCKS5 enabled. Replace the client IP placeholder before deployment; reuse an existing central Bastion instead of creating a duplicate. |
| [finops_observability.json](deployment/finops_observability.json) | Create the `nott-lz-finops` Notifications topic in `cmp-finops` for platform operational messages. |
| [finops_security.json](deployment/finops_security.json) | Create the `vlt-lz-finops` Vault and its encryption key in `cmp-lz-security`. Password Secrets are created separately in Step 3. |
| [finops_database.json](deployment/finops_database.json) | Create the private Autonomous Database using the compartment, subnet and NSG prepared above; see Step 2. |

The existing One-OE Landing Zone owns the `tagns-lz-cost-governance` namespace and its six tags: `tag-lz-cost-center`, `tag-lz-platform`, `tag-lz-environment`, `tag-lz-owner`, `tag-lz-business-unit`, and `tag-lz-project`. Provision them through the One-OE [governance configuration](../../blueprints/one-oe/runtime/one-stack/oneoe_governance.json) before deploying the FinOps addon. The addon reuses these tags; their definitions, allowed values, and tag defaults remain managed by One-OE.

**FOCUS installer compatibility:** The tag catalog installer in `finops-focus-platform` must support the six tag names above, including `tag-lz-platform`. Versions that require `tag-lz-application` must be updated before installing the tag catalog; commit `ffe4956` alone does not establish compatibility with this renamed tag. The installer checks existing OCI tags and does not create them. Apply the One-OE governance configuration before running a compatible tag catalog installer.

The configurations prepare infrastructure and access. Operations provisions ADB, OAC, its private access channel (PAC), Database Tools connections and credentials, and dashboard content. LZ administrators provision the central Bastion in `cmp-lz-security`, targeting the hub management subnet in `cmp-lz-network`. Both FinOps groups have shared-security session access. Restricted session grants in `cmp-finops` are retained for installations that still use the previous local Bastion.

### Configure the FinOps notification email before deployment

Terraform creates the `nott-lz-finops` topic and its configured subscriptions. Complete these steps before installing the FOCUS shared core:

1. In your deployment copy of [finops_observability.json](deployment/finops_observability.json), set `notifications_configuration.topics.NOTT-LZ-FINOPS-KEY.subscriptions` to the intended recipients. Replace any example or existing email address with your own operational mailbox; do not deploy another installation's recipient. For example:

   ```json
   "subscriptions": [
       {
           "protocol": "EMAIL",
           "values": ["finops-team@example.com"]
       }
   ]
   ```

2. Add `finops_observability.json` to the stack inputs while preserving existing FinOps IAM and network inputs. A separate stack must receive `CMP-FINOPS-KEY` through compartment dependencies. Apply the ADB dynamic group's `ONS_TOPIC_PUBLISH` grant from `finops_iam.json` in `cmp-finops`; creating the topic alone does not authorize publishing.
3. Validate the configuration, review the Terraform plan for the expected topic and email subscriptions, then apply it. OCI sends a confirmation email to each configured recipient.
4. Open the OCI confirmation email and confirm each subscription. Verify that its state is `ACTIVE` before continuing; Terraform creation alone does not confirm an email subscription. An empty `subscriptions` list creates only the topic and does not provide email delivery.
5. Supply the deployed topic OCID when the FOCUS shared core installer requests it. To change recipients later, update the deployment configuration, review and apply a new Terraform plan, and confirm each new subscription.

### Configure Bastion access before deployment

Use [finops_bastion.json](deployment/finops_bastion.json) for the central Bastion in `CMP-LZ-SECURITY-KEY`, targeting `SN-FRA-LZ-HUB-MGMT-KEY`. Reuse an already managed hub Bastion. When migrating from the previous FinOps-local Bastion, preserve its deployed configuration and state until central access has been validated: replacing its resource key or target subnet can delete and recreate the resource.

Before planning, replace `<YOUR_IP>` in `cidr_block_allow_list` with the public IPv4 address used by the Bastion client; keep `/32` for a single source IP. For an approved corporate range, replace the entire `<YOUR_IP>/32` entry with the required CIDR. The placeholder is not a valid CIDR and must not be deployed unchanged. Keep `enable_cidr_check` enabled and restrict the allowlist to the required sources.

The configuration sets a one-hour maximum session lifetime and enables FQDN/SOCKS5 support. Operators create temporary dynamic sessions separately using their SSH public keys. Use proxy-side DNS and the original private Database Actions/APEX HTTPS URL on port 443; database listener connections use their separately configured port and authentication. Follow the [OCI Bastion add-on](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/feature/bastion-addon-docs/addons/oci-bastion) for session and client setup.

Add the central Bastion to the owning LZ stack and retain every existing input. If the central resource is managed by the FinOps stack, provide the existing shared-security compartment and hub management subnet through compartment/network dependencies. Do not create another state owner for an existing Bastion. LZ administrators manage its lifecycle; the FinOps groups manage sessions. **Manual post-deployment configuration required:** verify the actual Bastion private endpoint, target security rules, DNS and the complete routed path. Oracle documents a same-VCN service boundary; the hub-to-FinOps cross-VCN pattern requires live validation and must not be presented as guaranteed support. See [Bastion Overview](https://docs.oracle.com/en-us/iaas/Content/Bastion/Concepts/bastionoverview.htm).

### Roles and compartment scope

| Group | FinOps compartment | Shared network compartment |
|---|---|---|
| `grp-lz-finops-db-admins` | Manage Autonomous Database and its VNICs; read Database Tools and use connections; use Bastions and manage restricted sessions. | Read networking; use VCNs/subnets/NSGs; manage private IPs and VNICs for ADB private endpoints. |
| `grp-lz-finops-oac-admins` | Manage OAC instances/PAC and VNICs; use private IPs; use Bastions and manage restricted sessions. | Read networking and use VCNs/subnets/NSGs. |

ADB/OAC and Database Tools permissions target `cmp-landingzone:cmp-lz-platform:cmp-finops`. Both policies additionally grant `use bastion`, session read/manage and work-request inspection in `cmp-landingzone:cmp-lz-security`. They do not grant Bastion access in `cmp-lz-network`. The shared-security grants allow session management across that compartment and do not restrict SOCKS5 destinations to FinOps; enforce the intended reachability with target security rules, routing and target authentication. DB/OAC administrators retain their separate private-endpoint dependencies.

**Bastion lifecycle boundary:** Both FinOps groups have `use bastion` and session permissions in shared security, plus the previous restricted grants in `cmp-finops`. LZ administrators create and delete the Bastion, including its network dependencies in `cmp-lz-network`. Neither FinOps group has `manage bastion`, so these templates do not authorize Bastion creation or deletion. Do not expand shared-network permissions to make those operations succeed. [Oracle: Bastion IAM](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

**Session visibility:** Each group has unconditional `read bastion-session` access within `cmp-finops` and `cmp-lz-security` to list and inspect sessions. Listing has no individual destination IP or session type against which to evaluate creation conditions. The read grants cover session metadata throughout those compartments; write permissions come from the separate session-management grants.

**Previous local Bastion restriction:** In `cmp-finops`, each group's separate `manage bastion-session` statement permits TCP port forwarding to destination IPs within the FinOps VCN, `10.0.24.0/26`. Update this condition when adapting the VCN CIDR. This is a destination-IP restriction, not a VCN-OCID condition on Bastion creation. Keep network rules limited to the approved endpoint ports. Do not add an unconditional `manage bastion-family` or session write grant that bypasses the restriction; also review inherited policies and other group memberships. Oracle documents the session-type and destination-IP conditions in its [Bastion access example](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengsettingupbastion.htm). This retained local pattern targets the FinOps VCN; the central cross-VCN pattern requires the separate topology validation described above. [Oracle: creating a Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-bastion.htm).

**A DBA connection OCID is not required in the human policy.** DBAs can use any Database Tools connection in `cmp-finops`. OAC administrators are not granted Database Tools connection access by these templates. Database permissions come from each connection's database account. Use resource principal runtime identity and grant each connection principal access only to its credential secret; this prerequisite is configured with the connection, outside these templates. [Oracle: connection permissions](https://docs.oracle.com/en-us/iaas/database-tools/doc/oracle-database-connections.html).

Shared-security session grants support the central SOCKS5 workflow and are not restricted to that session type. The retained `cmp-finops` grants authorize only fixed TCP port forwarding. If Managed SSH is introduced, review the session condition, target-host scope, and `read instance-agent-plugins` permission together. Configure a client allowlist and session lifetime when creating the Bastion. OAC application roles remain separate: assign the FinOps authors and OAC administrators their agreed application roles.

For OAC private dashboard endpoint creation/changes, have LZ network administrators perform the network operation: Oracle documents broader network permissions than the PAC permissions granted to the OAC group here. PAC connectivity alone does not make the dashboard URL private. [Oracle: private endpoint requirements](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/control-incoming-and-outgoingtraffic-private-endpoint-ingress-and-egress.html).

### Existing One-OE dependencies

For a separate FinOps infrastructure stack, supply the LZ dependency outputs through the Orchestrator's **Dependencies Source**:

| Dependency | Required keys |
|---|---|
| Compartments | `CMP-LZ-PLATFORM-KEY`, `CMP-LZ-NETWORK-KEY` |
| Identity domains | `COMMON-DOMAIN`, referring to `id_lz_common` |
| Network resources / dynamic routing gateways | `DRG-FRA-LZ-HUB-KEY` |
| Network resources / DRG route tables | `DRGRT-FRA-LZ-SPOKES-KEY` |

If the FinOps stack also manages the optional central Bastion, additionally supply `CMP-LZ-SECURITY-KEY` and `SN-FRA-LZ-HUB-MGMT-KEY` from the LZ outputs. Omit the Bastion configuration when that resource is already managed by the owning LZ stack.

Adapt domain/compartment names in the policies and regional names/CIDRs to the deployed LZ. Confirm existing LZ policies provide Console compartment discovery and permission to apply the required defined tags. These templates do not create a second identity domain, hub, or base LZ.

Use `finops_iam.json` and `finops_network.json` together for the infrastructure stack. Do **not** also pass the existing One-OE IAM/network configurations as extra inputs: Orchestrator v2.2.0's RMS facade selects the first occurrence of a top-level configuration key; it does not recursively merge duplicate blocks. For a single-stack deployment, merge the additions into the owning configuration before deployment.

### Staged IAM setup and existing resource ownership

The consolidated `finops_iam.json` includes both administrator access and ADB resource-principal access. It still requires two provisioning phases when the compartment and ADB do not yet exist:

1. In a private bootstrap copy, omit `identity_domain_dynamic_groups_configuration` and only the `PCY-LZ-FINOPS-ADB-RESOURCE-PRINCIPAL` entry from `policies_configuration.supplied_policies`. Keep the compartment, both human groups and their policies. Deploy that copy with the required network inputs, then provision the ADB.
2. After provisioning, restore those two entries in the same private IAM configuration and replace `<FINOPS_COMPARTMENT_OCID>` and `<FINOPS_ADB_OCID>` with the actual resource OCIDs. Keep the existing identity-domain dependency and every other stack input. Review the plan and apply the update to the same owning stack.

Do not deploy either placeholder unchanged. The IAM module does not substitute symbolic keys inside dynamic-group matching rules or policy statement strings.

For installations that already manage the ADB dynamic group and policy in a separate service-access Terraform state, consolidating the JSON files does **not** transfer resource ownership. Keep the deployed source copies and both states until an explicit ownership migration is prepared and reviewed. Reconcile existing policy statements, transfer management to the intended IAM stack without creating duplicates, and verify that neither plan deletes or recreates the resources. Do not apply the consolidated IAM file against a second owner or remove the resources from the original stack's inputs before that migration.

Configure each Database Tools connection's resource principal and credential-secret permissions before testing DBA SQL access. The ADB dynamic group is a separate principal for the OCI report-read endorsement. Database Resource Principal enablement and ingestion objects belong to the FinOps module installation in Step 4, after the credential preparation in Step 3.

### Private network and optional infra subnet

| Resource | CIDR | Purpose |
|---|---|---|
| FinOps VCN | `10.0.24.0/26` | Retains the existing two subnet ranges and provides room for infra. |
| OAC subnet | `10.0.24.0/28` | OAC private endpoint and PAC. |
| ADB subnet | `10.0.24.16/28` | Autonomous Database private endpoint. |
| Infra subnet | `10.0.24.32/28` | Optional Bastion and Database Tools private connectivity. |

DNS labels follow the One-OE regional naming pattern: `vcnfralzfinops` for the VCN, and `snfrafinopsoac`, `snfrafinopsdb`, and `snfrafinopsinf` for the OAC, ADB, and infra subnets. The infra suffix is shortened to `inf` to stay within OCI's 15-character limit. The VCN domain is `vcnfralzfinops.oraclevcn.com`. Changing these labels on an existing deployment requires replacing the VCN and affected network resources; review the Terraform plan before applying.

The infra subnet is included in the JSON and is created when that configuration is applied. To omit it, remove `SN-FRA-LZ-FINOPS-INFRA-KEY`, `SL-FRA-LZ-FINOPS-INFRA-KEY`, and the `infra_*` rules in both NSGs. There is no per-subnet enable switch in this module. The high-level architecture drawing does not include infra.

Attach `NSG-FRA-LZ-FINOPS-ADB-KEY` to ADB, and `NSG-FRA-LZ-FINOPS-OAC-KEY` to the applicable OAC endpoint and PAC. Rules allow OAC to ADB on TCP 1522, infra and hub management (`10.0.1.0/24` in this example; adapt it to the selected hub) to ADB on TCP 1522/443, and those administration sources to private OAC on TCP 443. Infra's security list supplies the corresponding outbound rules because a Bastion endpoint cannot be assumed to use a workload NSG. Service subnets have only path-MTU ingress in their security list; endpoint NSGs supply application access. No unrestricted egress rule overrides those controls.

OAC and infra source rules initially use their dedicated subnet CIDRs. After provisioning, narrow them to the PAC egress IPs, Bastion private-endpoint IP, and Database Tools reverse-connection IPs as appropriate. Stateful rules allow return traffic. No SSH port is opened on ADB or OAC. ADB's HTTPS egress to regional Oracle services supports FOCUS ingestion; Operations must configure and verify `ROUTE_OUTBOUND_CONNECTIONS = 'ENFORCE_PRIVATE_ENDPOINT'` before assuming DBMS_CLOUD uses that VCN path. [Oracle: ADB private endpoints](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/private-endpoints-autonomous.html).

Use OAC Enterprise Edition for PAC, register the ADB private DNS name, and check capacity for PAC and private dashboard endpoint together. Configure private DNS and routed client access for dashboard users. Additional on-premises client CIDRs and DNS forwarding are deployment-specific. [Oracle: PAC prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html).

### FinOps integration steps for an existing One-OE deployment

These additions belong to the FinOps deployment. **Do not add FinOps CIDRs, routes, attachment imports or operator grants to the repository's generic One-OE blueprints.** Keep those blueprints unchanged and make deployment-specific additions in customer-controlled private source configurations. If a configuration is generated by Blueprint Factory, change its source and regenerate it rather than editing generated JSON.

1. **Prepare the private inputs.** Copy/adapt the FinOps configurations for the deployed region and hub. Set the administration source rules to the actual hub management CIDR; `10.0.1.0/24` is the Hub E example here. Record which existing Terraform stack owns the hub network, the FinOps attachment and the central Bastion. Preserve their ownership and every existing stack input.
2. **Provision or update the FinOps resources.** Use `finops_iam.json` and `finops_network.json` with the existing LZ dependencies. The IAM configuration grants both FinOps groups session access in shared security while retaining the previous local-Bastion grants. Export `network_output.json` and obtain the actual attachment OCID from `network_resources.drg_attachments.DRGATT-FRA-LZ-FINOPS-KEY.id`.
3. **Prepare the hub integration in a private source configuration.** Add the FinOps route and attachment import described below to the configuration consumed by the existing hub-owning stack. Preserve its other routes and imports. The FinOps stack continues to own its attachment; the hub stack owns only its own route and import. Use the complete resulting network configuration as that stack's network input, rather than adding a second file with another top-level `network_configuration` block.
4. **Review each owning stack's plan before applying.** Confirm the intended IAM and network changes, retain any deployed database/security inputs and keep the existing Bastion until central access is validated. Review unrelated changes, replacements and deletions separately. After an approved apply, retain the updated private input lists for subsequent runs; otherwise a later run could remove the integration.
5. **Validate access as an operator.** Confirm the public source IP is allowlisted, create a temporary SOCKS5 session and test the original private Database Actions/APEX URL on TCP 443 and the database listener connection on its configured port, such as 1522. Verify DNS, forward and return routes, target security rules and database authentication. Also test denied destinations and session expiry. An active Bastion or local SSH listener alone does not establish database access; the cross-VCN service-boundary caveat above still applies.

The following snippets are additions to a private deployment configuration, not patches to the published One-OE blueprint files. They require no changes to `blueprints/` or `gen/` in this repository.

#### Hub E routing

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

#### Hub A routing

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

#### FinOps attachment import

For either hub, in the private configuration's `DRGRD-FRA-LZ-HUB-KEY`, add an import statement for the new attachment. Use an unused priority; `30` follows the current runtime's PROD/PREPROD priorities. For a separate addon stack, substitute the attachment OCID from its outputs:

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

For a new single-stack deployment, compose the FinOps attachment into the existing DRG's `drg_attachments` map, omit its `inject_into_existing_drgs` block, and use `drg_attachment_key: DRGATT-FRA-LZ-FINOPS-KEY` in this import statement. For an existing multistack deployment, keep the attachment in its current owner unless a separate state migration is planned and reviewed. Preserve all existing routes and imports. For firewalled hubs, do not import FinOps directly into the spoke route table: that would bypass the hub inspection path. Add the required firewall policy rules for permitted FinOps traffic and verify both directions. The local service-gateway and same-VCN paths intentionally do not traverse the hub firewall.

### Validation and migration

If an existing FinOps stack manages the cost-governance namespace or its tags, transfer their Terraform ownership to the One-OE stack before removing their definitions from the deployed FinOps inputs. Review both stacks' plans to ensure the existing namespace and tags are retained.

Before deployment, validate the bootstrap and final consolidated IAM configurations against Orchestrator v2.2.0 using the actual dependency outputs.

The V2 files use new resource keys and current One-OE names. They are not an automatic in-place migration of the older `lzp` deployment. For an existing installation, reconcile resource ownership and Terraform state before applying; do not deploy both examples into the same address space.

Validate the adapted configuration and inspect the plan for unintended replacements, missing dependencies, and unresolved placeholders. Then verify that neither FinOps group can manage shared VCN topology, use Bastions, or manage sessions in `cmp-lz-network` through these policies. Test central Bastion lifecycle as LZ administrators and shared-security session creation/list/get/delete as each FinOps role. Validate permitted and denied destinations through network controls. For the retained local Bastion, verify rejection of destinations outside the FinOps CIDR and non-port-forwarding session types. Also test DBA connection access, the absence of Database Tools grants for OAC administrators, OAC-to-ADB connectivity, FOCUS ingestion, and hub forward/return routing. Mocked plans verify configuration wiring, not live OCI IAM enforcement or network connectivity.

## Step 2: Create Autonomous Database

### Prerequisites

Before planning the database deployment, replace `<ADB_ADMIN_PASSWORD>` in a private deployment copy of [finops_database.json](deployment/finops_database.json) with an initial ADMIN password used for provisioning. Change it after database creation as described in Step 3. The initial password must contain 12–30 characters, including at least one uppercase letter, one lowercase letter, and one number, and must not contain double quotes or `admin` in any letter case. See the [Autonomous Database password requirements](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/db/autonomous-database/create.html#cmdoption-admin-password).

Keep the real password out of Git. The Autonomous Database module marks `admin_password` as sensitive to hide it in normal Terraform plan and apply output; this does not encrypt the JSON file, saved plan, or Terraform state. Restrict access to the private deployment copy, saved plans, and state.

Confirm that `CMP-FINOPS-KEY`, `SN-FRA-LZ-FINOPS-DB-KEY`, and `NSG-FRA-LZ-FINOPS-ADB-KEY` resolve to the intended resources. When using a separate database stack, supply the FinOps compartment and network dependency outputs. When adding the database to the existing FinOps stack, retain its IAM, network, and any deployed security inputs.

### Deployment options

- **Using the Orchestrator JSON configuration**
Include the reviewed private copy of [finops_database.json](deployment/finops_database.json) with the stack inputs. Run Terraform validation and plan, review the proposed resources, and apply only after approval.

- **Using the OCI Console**  
Alternatively, you can manually create the Autonomous Database through the OCI Console.  
Refer the [OCI documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/autonomous-provision.html) for step-by-step instructions.

> [!NOTE]
> When deploying the Autonomous Database, use the **compartment**, **VCN**, **subnet**, and **NSG** resources that were created as part of your Landing Zone setup for FinOps.  
> Complete the final `finops_iam.json` update with the actual FinOps compartment and ADB OCIDs before relying on the ADB dynamic group and report-reading policy. Existing separately managed resources require the ownership migration described above.
> Ensure you reuse those instead of creating new ones.

## Step 3: Prepare database credentials and Secrets

### Change the initial ADMIN password

After the ADB is available, change its initial ADMIN password before running the FinOps installer. Use the [Autonomous Database ADMIN password procedure](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/manage-users-create.html). Confirm that the new password works against the intended database.

The creation password in the private IaC input is a bootstrap credential. Coordinate its subsequent management with the infrastructure owner so a later Terraform apply does not unintentionally restore that bootstrap value.

### Create the password Secrets

The [security configuration](deployment/finops_security.json) provisions the Vault and encryption key, **not the Secrets**. After provisioning, create the following Secrets in **`vlt-lz-finops`**, in **`cmp-lz-security`**, in the same region as the ADB. Use the Vault's configured encryption key and the [OCI procedure for creating a Secret](https://docs.oracle.com/en-us/iaas/Content/secret-management/Tasks/create-secret.htm).

| Secret name | Content | Purpose |
| --- | --- | --- |
| `sec-lz-finops-adb-admin` | The **new, current ADMIN password**, after the change above. | Connect to the existing ADB as ADMIN. It must match the database password, not the bootstrap value. |
| `sec-lz-finops-adb-focus-platform` | A chosen password for `FOCUSPLATFORM`. | The module installer creates the schema owner using this password. |
| `sec-lz-finops-adb-oac-focus-reader` | A chosen password for `OAC_FOCUS_READER`. | The module installer creates the OAC reporting account using this password. |

Store only the raw password in each Secret, not a JSON document, username or connection string. With the Console, use manual secret content entry. Each Secret must be `ACTIVE` with the intended password in its `CURRENT` version. Choose database-compatible passwords; installer inputs must not contain double quotes or line breaks. Do not create the two schema accounts manually as part of this step.

### Before starting the module installation

Confirm the ADB and Vault are available, all three Secrets are ready, and the ADMIN Secret matches the changed database password. The identity running Python must be authorized to read their current contents. A direct SQL operator supplies the corresponding passwords as session inputs; the SQL scripts do not discover or retrieve Vault Secrets automatically.

These credentials are prepared once here as part of the complete add-on setup. The Python installation guide treats their existence and naming as prerequisites.

## Step 4: Install the FinOps database modules

Follow the [FinOps platform installation guide](installation-guide/README.md) and choose its Python or direct SQL route. Python uses the Landing Zone naming and Secret conventions; direct SQL uses explicitly supplied connection details and module inputs.

Both routes install the schemas and modules inside the existing ADB. They do not provision infrastructure. Use the current module sequence, including the initial OAC database reporting objects before pipeline startup; the installation guide owns those commands and their order.

## Step 5: Oracle Analytics Cloud Dashboard

Use [Oracle Analytics Cloud (OAC)](https://www.oracle.com/business-analytics/analytics-cloud.html) to present the FOCUS data ingested into Autonomous Database through FinOps dashboards and reports. Configure a [private access channel](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html) to connect OAC Enterprise Edition to the private ADB endpoint, then create the database connection and reporting content in OAC.

The private access channel provides outbound connectivity to ADB. Access to the OAC dashboard itself is configured separately through the OAC public or private endpoint and application roles.

[Oracle APEX](https://docs.oracle.com/en/database/oracle/apex/24.2/index.html) and other BI tools compatible with Oracle DB remain alternatives for existing implementations.

> **Tip:** Oracle APEX supports Generative AI to help you build apps and queries faster. [Learn more](https://docs.oracle.com/en/database/oracle/apex/24.2/htmdb/managing-generative-ai-in-apex.html)

> [!NOTE]
> The current deployment files do not provision OAC or its dashboard content. Configure these separately as part of the FinOps solution setup.
