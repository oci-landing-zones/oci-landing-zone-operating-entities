# **OCI LZ BCDR for One-OE**
## **Extending the One-OE blueprint with regional BCDR resources**

**Table of Contents**

- [**OCI LZ BCDR for One-OE**](#oci-lz-bcdr-for-one-oe)
  - [**Extending the One-OE blueprint with regional BCDR resources**](#extending-the-one-oe-blueprint-with-regional-bcdr-resources)
  - [1. Overview](#1-overview)
  - [2. Design](#2-design)
  - [3. Scope](#3-scope)
  - [4. Deployment model](#4-deployment-model)
    - [4.0. Prerequisite: Deploy the One-OE blueprint](#40-prerequisite-deploy-the-one-oe-blueprint)
    - [4.1. Deploy the One-OE DR extension](#41-deploy-the-one-oe-dr-extension)
      - [4.1.1. Complete staged hub networking](#411-complete-staged-hub-networking)
      - [4.1.2. Complete staged observability](#412-complete-staged-observability)
      - [4.1.3. Configure Service Connector bucket replication](#413-configure-service-connector-bucket-replication)
    - [4.2. Deploy inter-region RPC within the same tenancy](#42-deploy-inter-region-rpc-within-the-same-tenancy)
  - [License](#license)

## 1. Overview

This add-on provides the Disaster Recovery (DR) extension for the published One-OE One-Stack blueprint. It extends an existing One-OE deployment into a DR region.

## 2. Design

The One-OE BCDR design extends an existing One-OE blueprint into a DR region while reusing tenancy-level resources managed from the home region.

<img src="../images/one-oe-multi-region.png" width="900" alt="Generic two-region One-OE disaster recovery architecture with shared management groups, regional hub and production networks, and data replication to the DR region">

<p align="center"><strong>Figure 1: Generic two-region One-OE disaster recovery architecture</strong></p>

## 3. Scope

For a One-OE cross-region DR extension, the deployment scope is limited to:

- **Network**: regional VCN, DRG, routing, gateways, subnets, and other network resources required by the selected DR pattern.
- **Inter-region connectivity**: Remote Peering Connection (RPC) resources and the associated DRG attachments and routes. RPC resources are not part of the initial BCDR stack; they are added in the staged connectivity step after the regional network is deployed. Follow [Deploy inter-region RPC within the same tenancy](#42-deploy-inter-region-rpc-within-the-same-tenancy) for the published same-tenancy pattern. Use the [OCI Remote Peering Connections add-on](../../oci-x-rpc/README.md) for complete same-tenancy and cross-tenancy guidance.
- **Observability**: regional events, alarms, logs, topics, subscriptions, and monitoring resources required to operate and validate the DR environment.
- **Regional security**: the Vulnerability Scanning Service (VSS) configuration is deployed by this add-on. Tenancy-wide security and governance resources, such as Cloud Guard and Security Zones, remain managed by the One-OE blueprint from the home region and are not redeployed in the DR region.

## 4. Deployment model

### 4.0. Prerequisite: Deploy the One-OE blueprint

| [**One-OE + Hub A**](../../../blueprints/one-oe/runtime/one-stack/one_oe_hub_a.md) | [**One-OE + Hub B**](../../../blueprints/one-oe/runtime/one-stack/one_oe_hub_b.md) | [**One-OE + Hub C**](../../../blueprints/one-oe/runtime/one-stack/one_oe_hub_c.md) |
|:-|:-|:-|
| <img src="../../../blueprints/one-oe/design/images/oneoe_hub_a.png" width="300" alt="One-OE Hub A architecture"> | <img src="../../../blueprints/one-oe/design/images/oneoe_hub_b.png" width="300" alt="One-OE Hub B architecture"> | <img src="../../../blueprints/one-oe/design/images/oneoe_hub_c.png" width="300" alt="One-OE Hub C architecture"> |

This is a multi-stack deployment. First, deploy the One-OE blueprint stack in the home region, followed by the regional BCDR add-on stack in the DR region. Before deploying the BCDR add-on stack, replicate the required One-OE output dependency files from an Object Storage bucket in the home region to a bucket in the DR region. Configure the add-on stack to consume these files by using the orchestrator's outputs and dependencies features described in the [OCI Resource Manager multi-stack deployment guide](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/commons/content/orm_bp.md). This dependency replication is separate from the Service Connector bucket replication described later in this guide.

<img src="../images/orm_deployment_home_region.png" width="700" alt="OCI Resource Manager One-OE stack in Frankfurt saving output dependency files in an Object Storage bucket">

<p align="center"><strong>Figure 2: Home-region One-OE stack in Frankfurt</strong></p>

### 4.1. Deploy the One-OE DR extension

> [!NOTE]
> The published runtime preset uses `eu-frankfurt-1` as the home region and `eu-amsterdam-1` as the DR region.

Before deploying, ensure that the DR configuration uses the same hub model as the home-region One-OE deployment, and select the CIS level required by the DR design.

For a different region pair, use the [OCI LZ Blueprint Factory](../../oci-lz-blueprint-factory/README.md) with `--dr-config` to create and review the corresponding JSON configuration files. Blueprint Factory derives both peers, regional resource names, advertised CIDRs, and route placement from separate home- and DR-region files.

All deployable BCDR JSON configuration files are in the [`runtime`](./runtime/) directory.

For cross-region DR, manage each target region as an independent deployment unit. Use a distinct OCI Resource Manager stack or Terraform state/workspace per region so that regional network and observability resources can be planned, applied, and operated independently.

The initial BCDR stack deploys only the regional network and observability files, plus the regional VSS file from this add-on. RPC resources are deployed later by applying the requester and acceptor network replacement files, as described in [Deploy inter-region RPC within the same tenancy](#42-deploy-inter-region-rpc-within-the-same-tenancy). Reuse the home-region IAM and tenancy-wide security and governance model; do not redeploy or duplicate those resources in the DR region.

| Hub | CIS level | Deploy | Initial DR files |
|---|---:|---|---|
| Hub A | 1 | [<img src="../../../commons/images/DeployToOCI.svg" height="32" align="center" alt="Deploy Hub A with CIS Level 1 to OCI">][orm-cis1-hub-a] | `oneoe_bcdr_network_hub_a_pre.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` |
| Hub A | 2 | [<img src="../../../commons/images/DeployToOCI.svg" height="32" align="center" alt="Deploy Hub A with CIS Level 2 to OCI">][orm-cis2-hub-a] | `oneoe_bcdr_network_hub_a_pre.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` |
| Hub B | 1 | [<img src="../../../commons/images/DeployToOCI.svg" height="32" align="center" alt="Deploy Hub B with CIS Level 1 to OCI">][orm-cis1-hub-b] | `oneoe_bcdr_network_hub_b_pre.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` |
| Hub B | 2 | [<img src="../../../commons/images/DeployToOCI.svg" height="32" align="center" alt="Deploy Hub B with CIS Level 2 to OCI">][orm-cis2-hub-b] | `oneoe_bcdr_network_hub_b_pre.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` |
| Hub C | 1 | [<img src="../../../commons/images/DeployToOCI.svg" height="32" align="center" alt="Deploy Hub C with CIS Level 1 to OCI">][orm-cis1-hub-c] | `oneoe_bcdr_network_hub_c_pre.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` |
| Hub C | 2 | [<img src="../../../commons/images/DeployToOCI.svg" height="32" align="center" alt="Deploy Hub C with CIS Level 2 to OCI">][orm-cis2-hub-c] | `oneoe_bcdr_network_hub_c_pre.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` |

> [!IMPORTANT]
> **CIS Level 2:** In the home stack, replace the standard CIS2 security file with `oneoe_security_cis2_dr_pre.json` or `oneoe_security_cis2_dr.json` for the current phase. Apply it before creating the DR bucket so the key policy grants Object Storage access in both regions. Replicate the Vault manually and verify `isVaultReplicable` before starting the replica. See [Replicating Vaults and Keys](https://docs.oracle.com/en-us/iaas/Content/KeyManagement/Tasks/replicatingvaults.htm).

[orm-cis1-hub-a]: <https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.json"}>
[orm-cis1-hub-b]: <https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.json"}>
[orm-cis1-hub-c]: <https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.json"}>
[orm-cis2-hub-a]: <https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.json"}>
[orm-cis2-hub-b]: <https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.json"}>
[orm-cis2-hub-c]: <https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/master/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.json"}>

<img src="../images/orm_deployment_dr_region.png" width="700" alt="OCI Resource Manager BCDR stack in Amsterdam using an Object Storage bucket for replicated One-OE dependency files">

<p align="center"><strong>Figure 3: DR-region BCDR stack in Amsterdam</strong></p>

The DR-region BCDR stack reads the replicated One-OE output dependency files from Object Storage and does not save a new output file.

Copy exactly one `keys_output.json` from the home stack to the DR dependency bucket and include that object in `url_dependency_source_oci_objects`. The orchestrator's `rms-facade` derives `kms_dependency` internally from the top-level `keys` block. Do not provide two dependency documents containing a top-level `keys` block.

When deploying the published Frankfurt/Amsterdam preset with ORM, follow these steps:

1. Before creating the ORM DR stack, replicate the One-OE output dependency files from a home-region Object Storage bucket to a DR-region bucket. This is separate from the replication described in [Configure Service Connector bucket replication](#413-configure-service-connector-bucket-replication).
2. Open the BCDR deployment link in the OCI Console, select `eu-amsterdam-1` (Netherlands Northwest, Amsterdam), then accept the terms and wait for the configuration to load.
3. Set the working directory to `rms-facade`.
4. Set the stack name you prefer.
5. Set the Terraform version to 1.5.x. Click Next.
6. Review the selected JSON configuration files and confirm that they match the intended hub and CIS level. Click Next.
7. Before creating the stack, replace `email.address@example.com` in the selected initial observability file with the operational notification email addresses and confirm each email subscription. Repeat this change in the matching final observability file before following [Complete staged observability](#412-complete-staged-observability); otherwise the final replacement restores the placeholder addresses.
8. Configure the stack dependencies so the BCDR add-on consumes the required outputs from the blueprint One-OE stack.
9. Clear the Run apply check box. Click Create.
10. Run Plan and review the proposed regional network and observability changes before applying.
11. After approving the plan, run Apply to create the initial regional resources.

#### 4.1.1. Complete staged hub networking

Hub A and Hub B initially deploy their `*_pre.json` network file. After the referenced hub resources are created and their private IP OCIDs have been reviewed, update the same ORM stack or Terraform state by replacing it with the matching final network file (`oneoe_bcdr_network_hub_a.json` or `oneoe_bcdr_network_hub_b.json`).

Hub C follows the same staged process. Use `oneoe_bcdr_network_hub_c.json` after updating the standard hub resource references, or `oneoe_bcdr_network_hub_c_backends.json` when the design uses third-party firewall backend resources.

`oneoe_bcdr_security.json` deploys [Vulnerability Scanning Service (VSS)](https://docs.oracle.com/en-us/iaas/Content/scanning/using/overview.htm) recipes and targets in the DR region. It is included in the initial BCDR stack and does not need a staged replacement.

Security Zones are not redeployed in the DR region. The One-OE blueprint already associates the shared tenancy-wide compartment hierarchy with its Security Zones; OCI does not allow a compartment to belong to multiple Security Zones. Cloud Guard remains managed by the home-region blueprint. Vaults are regional: for CIS Level 2, manually replicate the Vault and its encryption key to the DR region before deployment, as noted in the deployment table. This add-on does not create that replica.

#### 4.1.2. Complete staged observability

The initial deployment uses `oneoe_bcdr_observability_cis1_pre.json` or `oneoe_bcdr_observability_cis2_pre.json`. After the final hub network configuration is applied, update the same stack or Terraform state to use the matching final observability file (`oneoe_bcdr_observability_cis1.json` or `oneoe_bcdr_observability_cis2.json`). The final file creates the flow logs for the DR-region hub and production network resources.

The BCDR observability files contain only regional DR resources. The home-region events remain managed by the home-region One-OE blueprint and are intentionally excluded from the DR stack.

#### 4.1.3. Configure Service Connector bucket replication

> [!IMPORTANT]
> **Manual post-deployment configuration required:** in the published preset, the BCDR observability files create `bkt-ams-lz-service-connector` as the destination bucket. After both stacks are deployed, configure an Object Storage replication policy from the home-region source bucket `bkt-fra-lz-service-connector` to that DR-region destination. See [Object Storage replication](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingreplication.htm).

This post-deployment replication is separate from the output dependency file replication completed before creating the BCDR stack. The DR-region configuration intentionally creates no Service Connector. The replication destination becomes read-only while replication is active, so it cannot also be the local target of a Service Connector.

### 4.2. Deploy inter-region RPC within the same tenancy

This add-on uses the X-RPC same-tenancy pattern. In the published preset, the
Frankfurt home region is the RPC acceptor and the Amsterdam DR region is the
requester. No additional cross-tenancy IAM or governance configuration is
required. Select the X-RPC replacement files that match the hub model deployed
in both regions.

For the complete deployment order, acceptor/requester file selection, dependency
replication, RPC examples, peer-reference handling, and validation steps, see
[Same-Tenancy, Multi-Region Deployment](../../oci-x-rpc/runtime/README.md#same-tenancy-multi-region-deployment)
in the OCI X-RPC runtime guide.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../../LICENSE.txt) for more details.
