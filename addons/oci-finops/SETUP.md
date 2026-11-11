# OCI FinOps Setup Guide

This guide covers the complete setup of the OCI FinOps add-on: provisioning Landing Zone resources and ADB, preparing database credentials, installing the database modules, and configuring OAC.

## Prerequisites

**Existing Landing Zone:** A One-OE Landing Zone must already be deployed in the parent tenancy. The add-on consumes its shared compartments, identity domain, hub/network resources and governance tags; it does not deploy the base Landing Zone.

**Governance tagging:** One-OE must already provide an active `tagns-lz-cost-governance` namespace and the six active tag definitions listed in [FinOps Tagging](README.md#finops-tagging). All six tags are mandatory, with controlled values defined in advance by the organization. Configure the corresponding One-OE tag defaults and ensure the tag values in the private FinOps deployment inputs belong to the allowed lists. Complete this configuration before provisioning the add-on; the infrastructure and database installers reuse these tags rather than create them.

## Setup steps

Complete the following steps in order:

1. [Provision the FinOps infrastructure and ADB](#step-1-provision-finops-infrastructure-and-adb) using the JSON configurations and Terraform-based Orchestrator.
2. [Change the initial ADMIN password and prepare the Secrets](#step-2-prepare-database-credentials-and-secrets).
3. [Install the FinOps database modules](#step-3-install-the-finops-database-modules) using Python, the default installation method.
4. [Configure OAC and its reporting content](#step-4-oracle-analytics-cloud-dashboard).

Infrastructure provisioning does not create the password Secrets. Complete the credential preparation in [Step 2](#step-2-prepare-database-credentials-and-secrets) before starting either installation route.

## Step 1: Provision FinOps infrastructure and ADB

Provision one FinOps stack on the existing One-OE Landing Zone: compartment, IAM, private networking, ADB, Vault/key, notifications and central Bastion access. The Bastion belongs in **`cmp-lz-security`**, using the hub management subnet. OAC is configured in Step 4; password Secrets are prepared in Step 2.

### Execution method

Both options run the **Landing Zone Orchestrator** using the JSON files below:

- **OCI Resource Manager:** OCI runs Terraform; the Orchestrator reads your deployment JSONs from an authorized, organization-controlled private Object Storage bucket.
- **Terraform CLI:** run the Orchestrator on a prepared administration host or CI/CD runner, with access to the protected deployment JSONs.

Use **Orchestrator v2.2.0**, IAM module **v0.3.5**, and networking module **v0.9.0**.

### Configuration files

| File | Resources |
| --- | --- |
| [finops_iam.json](deployment/infrastructure/finops_iam.json) | FinOps compartment, administrator groups, ADB Dynamic Group and policies. |
| [finops_network.json](deployment/infrastructure/finops_network.json) | FinOps VCN, private subnets, NSGs, service gateway and attachment to the existing hub DRG. |
| [finops_database.json](deployment/infrastructure/finops_database.json) | Private Autonomous Database. |
| [finops_security.json](deployment/infrastructure/finops_security.json) | Vault and encryption key in `cmp-lz-security`. |
| [finops_observability.json](deployment/infrastructure/finops_observability.json) | Notifications topic and email subscriptions. |
| [finops_bastion.json](deployment/infrastructure/finops_bastion.json) | Central Bastion in `cmp-lz-security`; omit this file when reusing an existing managed central Bastion there. |

### Changes before deployment

Edit private deployment copies. Keep credentials out of Git and retain the published resource keys unless adapting the configuration consistently.

| File / area | Fields to review or change |
| --- | --- |
| **Database** | Replace `<ADB_ADMIN_PASSWORD>` in `admin_password`. Retain the published sizing and networking unless your requirements differ. Change ADMIN after creation in Step 2. |
| **Notifications** | Replace `email.address@example.com` in `subscriptions[].values` with the operational recipients. |
| **Network** | Check the region-specific names/keys, VCN/subnet CIDRs, `hub_mgmt_*` source CIDRs and hub DRG/route-table references. Avoid overlapping networks. The JSON's administration source is `10.0.1.0/24`; use the actual hub management CIDR (the published Hub A shape uses `10.0.3.0/24`). |
| **Bastion** | Replace `<YOUR_IP>/32` in `cidr_block_allow_list` with approved source IPs/CIDRs. Confirm the existing hub management subnet. Keep `default_compartment_id=CMP-LZ-SECURITY-KEY`; the compartment is not a deployment choice. |
| **IAM** | Confirm `COMMON-DOMAIN`, domain/compartment names in policy strings and the FinOps CIDR condition. Prepare the bootstrap configuration below; the final RP entries need the actual compartment and ADB OCIDs. |
| **Security** | Keep the Vault/key in `CMP-LZ-SECURITY-KEY` and the `vlt-lz-finops` name expected by Python discovery. Reuse existing managed resources through their owner. Secrets are created in Step 2. |
| **All tagged resources** | Replace `tobedefined` and verify every tag value, including `shared`, `finops`, `security` and `notapply`, belongs to the organization's controlled lists. Update both defaults and any per-resource `defined_tags` overrides. |

The initial ADB password must meet the [ADB password requirements](https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/db/autonomous-database/create.html#cmdoption-admin-password): 12–30 characters, uppercase/lowercase letters and a number, without double quotes or `admin` in any letter case. Restrict access to the private JSON, saved plans and Terraform state.

### Deploy and verify

1. **Supply existing LZ dependencies** through the Orchestrator's Dependencies Source:

   | Dependency | Keys |
   | --- | --- |
   | Compartments | `CMP-LZ-PLATFORM-KEY`, `CMP-LZ-NETWORK-KEY`, `CMP-LZ-SECURITY-KEY`. |
   | Identity domain | `COMMON-DOMAIN`, referring to `id_lz_common`. |
   | Hub | `DRG-FRA-LZ-HUB-KEY` and the hub's spoke DRG route table; the published FinOps JSON references `DRGRT-FRA-LZ-SPOKES-KEY`. |
   | Bastion subnet | `SN-FRA-LZ-HUB-MGMT-KEY` when provisioning the central Bastion. |

2. **Bootstrap the same FinOps stack.** In the private IAM copy, temporarily omit `identity_domain_dynamic_groups_configuration` and only `PCY-LZ-FINOPS-ADB-RESOURCE-PRINCIPAL` from supplied policies. Keep the compartment, administrator groups/policies and all other selected FinOps JSONs, including ADB. Validate, review the plan and apply.
3. **Complete ADB Resource Principal IAM.** Restore those two entries, replacing `<FINOPS_COMPARTMENT_OCID>` and `<FINOPS_ADB_OCID>` with the created resource OCIDs. Review and apply to the same stack. These placeholders are not automatically substituted inside policy strings or matching rules.
4. **Complete hub connectivity.** Follow the [One-OE network and access integration reference](installation-guide/infrastructure/one-oe-integration.md) for routing, attachment imports and access validation.
5. **Confirm readiness.** Verify ADB/Vault availability, Bastion access, and the intended IAM permissions. Confirm each Notifications email subscription is `ACTIVE` and retain the topic OCID for the Core configuration.

### Created resource names

Check the deployment outputs against these names from the published JSON files (`fra` is their region key).

| Resource | Name |
| --- | --- |
| FinOps compartment | `cmp-finops` |
| Administrator groups | `grp-lz-finops-db-admins`; `grp-lz-finops-oac-admins` |
| ADB Dynamic Group | `dg-lz-finops-adb` |
| IAM policies | `pcy-lz-finops-db-admins`; `pcy-lz-finops-oac-admins`; `pcy-lz-finops-adb-rp` |
| Autonomous Database | Display name `adb-fra-lz-finops`; database name `FINOPS` |
| VCN | `vcn-fra-lz-finops` |
| Private subnets | `sn-fra-lz-finops-oac`; `sn-fra-lz-finops-db`; `sn-fra-lz-finops-infra` |
| Route table | `rt-fra-lz-finops` |
| Security lists | `sl-fra-lz-finops-services`; `sl-fra-lz-finops-infra` |
| Network security groups | `nsg-fra-lz-finops-adb`; `nsg-fra-lz-finops-oac` |
| Service gateway | `sgw-fra-lz-finops` |
| Hub DRG attachment | `drgatt-fra-lz-finops` |
| Vault | `vlt-lz-finops` |
| Encryption key for all three password Secrets | `key-lz-finops-adb-admin` |
| Notifications topic | `nott-lz-finops` |
| Central Bastion, when provisioned | `bastionfralzhub`, in `cmp-lz-security` |

The existing identity domain, shared compartments and hub are reused. A reused central Bastion keeps its existing name and owner. Secrets are prepared in Step 2 and OAC in Step 4.

## Step 2: Prepare database credentials and Secrets

### Change the initial ADMIN password

After the ADB is available, change its initial ADMIN password before running the FinOps installer. Use the [Autonomous Database ADMIN password procedure](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/manage-users-create.html). Confirm that the new password works against the intended database.

The creation password in the private IaC input is a bootstrap credential. Coordinate its subsequent management with the infrastructure owner so a later Terraform apply does not unintentionally restore that bootstrap value.

### Create the password Secrets

The [security configuration](deployment/infrastructure/finops_security.json) provisions the Vault and encryption key, **not the Secrets**. After provisioning, create the following Secrets in **`vlt-lz-finops`**, in **`cmp-lz-security`**, in the same region as the ADB. Use the single encryption key `key-lz-finops-adb-admin`, already created in Step 1, for all three Secrets. Follow the [OCI procedure for creating a Secret](https://docs.oracle.com/en-us/iaas/Content/secret-management/Tasks/create-secret.htm).

| Secret name | Content | Purpose |
| --- | --- | --- |
| `sec-lz-finops-adb-admin` | The **new, current ADMIN password**, after the change above. | Connect to the existing ADB as ADMIN. It must match the database password, not the bootstrap value. |
| `sec-lz-finops-adb-focus-platform` | A chosen password for `FOCUSPLATFORM`. | The module installer creates the schema owner using this password. |
| `sec-lz-finops-adb-oac-focus-reader` | A chosen password for `OAC_FOCUS_READER`. | The module installer creates the OAC reporting account using this password. |

Store only the raw password in each Secret, not a JSON document, username or connection string. With the Console, use manual secret content entry. Each Secret must be `ACTIVE` with the intended password in its `CURRENT` version. Choose database-compatible passwords; installer inputs must not contain double quotes or line breaks. Do not create the two schema accounts manually as part of this step.

### Before starting the module installation

**Python is the default method.** Follow the [Python configuration and validation procedure](installation-guide/database-modules/python-installation.md#configure-validate-and-install) before installing. Validation checks ADMIN Secret access and a read-only connection to ADB.

For a manual SQL installation, consult the [manual prerequisites and connection preparation](installation-guide/database-modules/manual-sql-installation.md#manual-prerequisites).

## Step 3: Install the FinOps database modules

Follow the [FinOps installation guide](installation-guide/README.md) for the database module installation procedure and verification.

## Step 4: Oracle Analytics Cloud Dashboard

Follow the [OAC setup guides](installation-guide/README.md#2-create-and-configure-oac) for service creation, ADB connectivity, workbook import, consumer access and optional AI Assistant configuration. OAC is configured separately from the infrastructure JSONs.
