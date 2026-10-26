# OCI FinOps Setup Guide

## Prerequisite

To deploy the OCI FinOps addon, it is recommended to start with an Oracle recommended Foundational Landing Zone such as a [CIS landing zone](https://github.com/oci-landing-zones/oci-cis-landingzone-quickstart), [OCI Core Landing Zone](https://github.com/oci-landing-zones/terraform-oci-core-landingzone) or [OCI Operating Entities Landing Zone](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/).  

&nbsp;

## Step 1: Setup One-OE Landing Zone with FinOps V2

This step prepares IAM and networking; it does not create Autonomous Database, Oracle Analytics Cloud, or Bastion.

Prefer OCI Resource Manager with customer-controlled private Object Storage and a pinned Orchestrator version. Terraform CLI remains a supported alternative. Review the dependencies, network integration, and validation requirements below before applying.

The published V2 network configuration targets Hub A, including its management subnet `10.0.3.0/24`. Adapt a deployment copy to the selected hub topology and complete the required hub routing in the owning Landing Zone stack. For Hub E, verify the actual management subnet; the standard published blueprint uses `10.0.1.0/24`.

These configurations add the FinOps platform to an existing One-OE Landing Zone using **Orchestrator v2.2.0**, IAM module **v0.3.5**, and networking module **v0.9.0**.

### Configuration files

| File | Purpose |
|---|---|
| [finops_iam.json](deployment/finops_iam.json) | Create `cmp-finops` under the existing shared platform compartment, two groups in `id_lz_common`, and their policies. |
| [finops_network.json](deployment/finops_network.json) | Create the FinOps VCN, private OAC/ADB/infra subnets, service gateway, security lists, two NSGs, and an attachment to the existing Hub A DRG. |
| [finops_governance.json](deployment/finops_governance.json) | Create the active `tagns-lz-cost-governance` namespace and its six defined tags at tenancy root, following One-OE naming. |
| [finops_observability.json](deployment/finops_observability.json) | Create the `nott-lz-finops` Notifications topic in `cmp-finops` for platform operational messages. |
| [finops_service_access.json](deployment/finops_service_access.json) | After provisioning, enable the ADB report-reading principal and tag-metadata access. Replace the compartment OCID placeholder before using this file. |

Include `finops_governance.json` in the FinOps stack inputs. It defines the active namespace `tagns-lz-cost-governance` (`TAGNS-LZ-COST-GOVERNANCE-KEY`) and the tags `tag-lz-cost-center`, `tag-lz-platform`, `tag-lz-environment`, `tag-lz-owner`, `tag-lz-business-unit`, and `tag-lz-project`, with corresponding `TAG-LZ-...-KEY` identifiers. Each tag restricts assignments to its `valid_values` list, including the literal string `none`. The example values must be adapted to the customer's catalog. No tag defaults or automatic assignment to resources are configured; OCI cost-tracking flags are disabled. If the namespace already exists, reconcile its Terraform ownership before applying. For a combined stack, merge this namespace into the existing `tags_configuration.namespaces` map rather than supplying duplicate top-level configuration blocks.

**FOCUS installer compatibility:** The tag catalog installer in `finops-focus-platform` must support the six tag names above, including `tag-lz-platform`. Versions that require `tag-lz-application` must be updated before installing the tag catalog; commit `ffe4956` alone does not establish compatibility with this renamed tag. The installer checks existing OCI tags and does not create them. Apply this governance configuration before running a compatible tag catalog installer.

The configurations prepare infrastructure and access. Operations provisions ADB, OAC, its private access channel (PAC), Database Tools connections and credentials, and dashboard content. LZ administrators provision the Bastion in `cmp-finops`, targeting the FinOps VCN's infra subnet in `cmp-lz-network`. Both FinOps groups have session access only in `cmp-finops`.

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

2. Add `finops_observability.json` to the stack inputs while preserving existing IAM, network, and governance inputs. A separate stack must receive `CMP-FINOPS-KEY` through compartment dependencies. Apply the ADB dynamic group's `ONS_TOPIC_PUBLISH` grant from `finops_service_access.json` in `cmp-finops`; creating the topic alone does not authorize publishing.
3. Validate the configuration, review the Terraform plan for the expected topic and email subscriptions, then apply it. OCI sends a confirmation email to each configured recipient.
4. Open the OCI confirmation email and confirm each subscription. Verify that its state is `ACTIVE` before continuing; Terraform creation alone does not confirm an email subscription. An empty `subscriptions` list creates only the topic and does not provide email delivery.
5. Supply the deployed topic OCID when the FOCUS shared core installer requests it. To change recipients later, update the deployment configuration, review and apply a new Terraform plan, and confirm each new subscription.

### Roles and compartment scope

| Group | FinOps compartment | Shared network compartment |
|---|---|---|
| `grp-lz-finops-db-admins` | Manage Autonomous Database and its VNICs; read Database Tools and use connections; use Bastions and manage restricted sessions. | Read networking; use VCNs/subnets/NSGs; manage private IPs and VNICs for ADB private endpoints. |
| `grp-lz-finops-oac-admins` | Manage OAC instances/PAC and VNICs; use private IPs; use Bastions and manage restricted sessions. | Read networking and use VCNs/subnets/NSGs. |

ADB/OAC, Database Tools, and Bastion permissions target `cmp-landingzone:cmp-lz-platform:cmp-finops`. Neither policy grants access to Bastions or sessions in `cmp-landingzone:cmp-lz-network`. DB/OAC administrators retain the separate private-endpoint dependencies listed above; those grants must not be mistaken for read-only networking.

**Bastion lifecycle boundary:** Both FinOps groups have `use bastion` and restricted session permissions in `cmp-finops`. LZ administrators create and delete the Bastion, including its network dependencies in `cmp-lz-network`. Neither FinOps group has `manage bastion`, so these templates do not authorize Bastion creation or deletion. Do not expand shared-network permissions to make those operations succeed. [Oracle: Bastion IAM](https://docs.oracle.com/en-us/iaas/Content/Bastion/Reference/bastionpolicyreference.htm).

**Session visibility:** Each group has unconditional `read bastion-session` access within `cmp-finops` to list and inspect sessions. Listing has no individual destination IP or session type against which to evaluate creation conditions. This read grant covers session metadata throughout `cmp-finops`; it grants no session creation, update, or deletion permissions.

**Session restriction:** Each group's separate `manage bastion-session` statement permits TCP port forwarding to destination IPs within the FinOps VCN, `10.0.24.0/26`. Update this condition when adapting the VCN CIDR. This is a destination-IP restriction, not a VCN-OCID condition on Bastion creation. Keep network rules limited to the approved endpoint ports. Do not add an unconditional `manage bastion-family` or session write grant that bypasses the restriction; also review inherited policies and other group memberships. Oracle documents the session-type and destination-IP conditions in its [Bastion access example](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengsettingupbastion.htm). The Bastion's target VCN must be the FinOps VCN; its compartment and subnet compartment can differ. [Oracle: creating a Bastion](https://docs.oracle.com/en-us/iaas/Content/Bastion/Tasks/create-bastion.htm).

**A DBA connection OCID is not required in the human policy.** DBAs can use any Database Tools connection in `cmp-finops`. OAC administrators are not granted Database Tools connection access by these templates. Database permissions come from each connection's database account. Use resource principal runtime identity and grant each connection principal access only to its credential secret; this prerequisite is configured with the connection, outside these templates. [Oracle: connection permissions](https://docs.oracle.com/en-us/iaas/database-tools/doc/oracle-database-connections.html).

The common Bastion access is for TCP forwarding to managed-service endpoints. Managed SSH and dynamic SOCKS5 sessions are not authorized by these session statements. If Managed SSH is introduced, review the session condition, target-host scope, and `read instance-agent-plugins` permission together. Configure a client allowlist and session lifetime when creating the Bastion. OAC application roles remain separate: assign the FinOps authors and OAC administrators their agreed application roles.

For OAC private dashboard endpoint creation/changes, have LZ network administrators perform the network operation: Oracle documents broader network permissions than the PAC permissions granted to the OAC group here. PAC connectivity alone does not make the dashboard URL private. [Oracle: private endpoint requirements](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/control-incoming-and-outgoingtraffic-private-endpoint-ingress-and-egress.html).

### Workload setup helpers

The [Terraform ADB example](deployment/terraform/README.md) and [SQL ingestion scripts](deployment/sql/) are retained as workload setup helpers. They are separate from the V2 IAM/network infrastructure stack. Use the V2 compartment, subnet, and NSG outputs when configuring ADB, and keep `create_policy = false` to reuse the service-access configuration. Review and adapt the SQL scripts before execution; they are not run by the infrastructure stack.

### Existing One-OE dependencies

For a separate FinOps infrastructure stack, supply the LZ dependency outputs through the Orchestrator's **Dependencies Source**:

| Dependency | Required keys |
|---|---|
| Compartments | `CMP-LZ-PLATFORM-KEY`, `CMP-LZ-NETWORK-KEY` |
| Identity domains | `COMMON-DOMAIN`, referring to `id_lz_common` |
| Network resources / dynamic routing gateways | `DRG-FRA-LZ-HUB-KEY` |
| Network resources / DRG route tables | `DRGRT-FRA-LZ-SPOKES-KEY` |

Adapt domain/compartment names in the policies and regional names/CIDRs to the deployed LZ. Confirm existing LZ policies provide Console compartment discovery and permission to apply the required defined tags. These templates do not create a second identity domain, hub, or base LZ.

Use `finops_iam.json` and `finops_network.json` together for the infrastructure stack. Do **not** also pass the existing One-OE IAM/network configurations as extra inputs: Orchestrator v2.2.0's RMS facade selects the first occurrence of a top-level configuration key; it does not recursively merge duplicate blocks. For a single-stack deployment, merge the additions into the owning configuration before deployment.

After `cmp-finops` exists, replace `<FINOPS_COMPARTMENT_OCID>` in `finops_service_access.json`. The IAM module does not substitute symbolic compartment keys inside dynamic-group matching-rule strings. Apply this file through a separate service-access stack using the same identity-domain dependency, or merge its policy entries and dynamic-group configuration into the infrastructure IAM file. Do not replace the infrastructure stack's entire input list with this smaller file: that would remove resources from its configuration.

Configure each Database Tools connection's resource principal and credential-secret permissions before testing DBA SQL access. The ADB dynamic group is a separate principal for the preserved OCI report-read endorsement. Enable the database resource principal using [`sql/admin.sql`](deployment/sql/admin.sql), then adapt and run [`sql/finopsuser.sql`](deployment/sql/finopsuser.sql) as the FinOps database user to configure report ingestion.

### Private network and optional infra subnet

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

### Required Hub A integration in the owning LZ stack

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

### Validation and migration

Run the static IAM boundary regression checks from the repository root:

```sh
python3 -m unittest discover -s addons/oci-finops/finops-setup/deployment/tests -v
```

These checks require exactly the DB and OAC administrator groups and reject policies referring to other human groups. They also reject Bastion grants outside `cmp-finops`, Bastion lifecycle management, and VCN topology management grants. Session destinations must match the FinOps VCN, and aggregate Bastion grants cannot bypass the session conditions.

Before deployment, validate the two-group infrastructure configuration and the ADB service-access configuration against Orchestrator v2.2.0 using the actual dependency outputs. Static checks do not establish live OCI authorization or network connectivity.

The V2 files use new resource keys and current One-OE names. They are not an automatic in-place migration of the older `lzp` deployment. For an existing installation, reconcile resource ownership and Terraform state before applying; do not deploy both examples into the same address space.

Validate the adapted configuration and inspect the plan for unintended replacements, missing dependencies, and unresolved placeholders. Then verify that neither FinOps group can manage shared VCN topology, use Bastions, or manage sessions in `cmp-lz-network` through these policies. Test LZ-admin Bastion creation/deletion in `cmp-finops`, session creation/list/get/delete as each role, and rejection of destinations outside the FinOps CIDR and non-port-forwarding session types. Also test DBA connection access, the absence of Database Tools grants for OAC administrators, OAC-to-ADB connectivity, FOCUS ingestion, and hub forward/return routing. Mocked plans verify configuration wiring, not live OCI IAM enforcement or network connectivity.

## Step 2: Create Autonomous Database
Please choose a strong ADMIN password for the Autonomous Data Warehouse (ADW) and store it securely in an OCI Secret.

Refer to the [official documentation](https://docs.oracle.com/en-us/iaas/Content/secret-management/Tasks/create-secret.htm) for steps to create a secret in OCI.

Storing the password as a secret is **recommended** when using the provided Terraform script. Protect the Terraform state as sensitive data; using a secret does not by itself guarantee that credentials are absent from state.

You can run the Terraform script directly using **OCI Cloud Shell** for convenience and security.


- **Using Terraform**  
Use the example [Terraform script](/addons/oci-finops/finops-setup/deployment/terraform/) provided in this repository to deploy the Autonomous Data Warehouse (ADW).
Refer the [ADB documentation](https://docs.oracle.com/en/cloud/paas/autonomous-database/index.html) for more details.

- **Using the OCI Console**  
Alternatively, you can manually create the Autonomous Database through the OCI Console.  
Refer the [OCI documentation](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/autonomous-provision.html) for step-by-step instructions.

> [!NOTE]
> When deploying the Autonomous Database, use the **compartment**, **VCN**, **subnet**, and **NSG** resources that were created as part of your Landing Zone setup for FinOps.  
> Apply the V2 **service-access configuration** with the actual FinOps compartment OCID before relying on the ADB dynamic group and report-reading policy.
> Ensure you reuse those instead of creating new ones.

## Step 3: Connect to ADW and Run SQL Scripts
### Step 3.1: Connect to ADW
Connect to the ADW using [SQL worksheet](https://docs.oracle.com/en-us/iaas/database-tools/doc/run-sql-statement-sql-worksheet.html) available in OCI  or other SQL client tools.


### Step 3.2: Run SQL Scripts as ADMIN User
[Resource Principal](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/resource-principal.html) is used to give access for the autonomous database. 


Run the following SQL scripts [admin.sql](/addons/oci-finops/finops-setup/deployment/sql/admin.sql) using the ADMIN user.

### Step 3.3: Run SQL Scripts as FINOPS User

Run the SQL scripts provided in [finopsuser.sql](/addons/oci-finops/finops-setup/deployment/sql/finopsuser.sql) using the newly created FINOPS user:

[DBMS_CLOUD_PIPELINE](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/autonomous-pipeline.html) is used to load data from objectstorage into the autonomous database. 

> [!NOTE]
> Replace the objectstorage url with your region objectstorage URL ,tenancy ocid and year in the placeholder in line number 71 for the set_attribute. 

This is used to ingest all the previous and upcoming FOCUS reports of your tenancy into ADW for that year. If you have more old files to load scale the ADW so the pipeline will run faster for the initial load and you can scale it down later.

Example: `https://objectstorage.<region>.oraclecloud.com/n/<namespace>/b/<bucket>/o/FOCUS%20Reports/<year>`. 

This will download all the previous reports for the year 2025 and also the new reports getting generated for that year later.

The interval for the dbms_cloud_pipeline is set to 60 minutes in finopsuser.sql. 


By following these steps, you should be able to successfully deploy the FINOPS solution which will ingest FOCUS reports into Autonomous database automatically.

> [!NOTE]
> This solution has been tested with Autonomous Database 23ai version for the FOCUS 1.0 specification .

## Step 4. Oracle Analytics Cloud Dashboard

Use [Oracle Analytics Cloud (OAC)](https://www.oracle.com/business-analytics/analytics-cloud.html) to present the FOCUS data ingested into Autonomous Database through FinOps dashboards and reports. Configure a [private access channel](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/prerequisites-private-access-channel.html) to connect OAC Enterprise Edition to the private ADB endpoint, then create the database connection and reporting content in OAC.

The private access channel provides outbound connectivity to ADB. Access to the OAC dashboard itself is configured separately through the OAC public or private endpoint and application roles.

[Oracle APEX](https://docs.oracle.com/en/database/oracle/apex/24.2/index.html) and other BI tools compatible with Oracle DB remain alternatives for existing implementations.

> **Tip:** Oracle APEX supports Generative AI to help you build apps and queries faster. [Learn more](https://docs.oracle.com/en/database/oracle/apex/24.2/htmdb/managing-generative-ai-in-apex.html)

> [!NOTE]
> The current deployment files do not provision OAC or its dashboard content. Configure these separately as part of the FinOps solution setup.
