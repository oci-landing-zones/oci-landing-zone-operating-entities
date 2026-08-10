# **OCI LZ BCDR for One-OE**
## **Extending the One-OE baseline with regional BCDR resources**

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Design](#2-design)<br>
[3. Scope](#3-scope)<br>
[4. Deployment model](#4-deployment-model)<br>


&nbsp;

### 1. Overview

This folder contains the One-OE-specific Disaster Recovery (DR) extension files for the published One-OE One-Stack Baseline.

The extension provisions the regional resources required to support cross-region Business Continuity and Disaster Recovery (BC/DR), while reusing the existing baseline resources that are managed from the tenancy’s home region and available across regions.

&nbsp;

### 2. Design

The One-OE BC/DR design extends an existing One-OE baseline into a DR region while reusing tenancy-level resources managed from the home region.

<img src="../images/one-oe-multi-region.png" width="900">

&nbsp;

### 3. Scope

For a One-OE DR cross-region extension, the required deployable files are limited to:

- **Network**: regional VCN, DRG, routing, peering, gateways, subnets, and other connectivity resources required by the selected DR pattern.
- **Observability**: regional events, alarms, logs, topics, subscriptions, and monitoring resources required to operate and validate the DR environment.
- **Security**: regional Vulnerability Scanning Service (VSS) configuration. Security Zones remain managed by the One-OE baseline.

### 4. Deployment model

**Step 0. Prerequisite: Deploy the One-OE baseline**

| [**One-OE + Hub A**](/blueprints/one-oe/runtime/one-stack/one_oe_hub_a.md) | [**One-OE + Hub B**](/blueprints/one-oe/runtime/one-stack/one_oe_hub_b.md) | [**One-OE + Hub C**](/blueprints/one-oe/runtime/one-stack/one_oe_hub_c.md) | [**One-OE + Hub E**](/blueprints/one-oe/runtime/one-stack/one_oe_hub_e.md) |
|:-|:-|:-|:-|
| <img src="../../../blueprints/one-oe/design/images/oneoe_hub_a.png" width="300"> | <img src="../../../blueprints/one-oe/design/images/oneoe_hub_b.png" width="300"> | <img src="../../../blueprints/one-oe/design/images/oneoe_hub_c.png" width="300"> | <img src="../../../blueprints/one-oe/design/images/oneoe_hub_e.png" width="340"> |

This is a multi-stack deployment: Step 0 deploys the One-OE baseline and Step 1 deploys the regional BCDR addon. Before deploying Step 1, configure the addon stack to consume the required outputs from the baseline stack by using the orchestrator's outputs and dependencies features described in the [OCI Resource Manager multi-stack deployment guide](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/dr/commons/content/orm_bp.md).

<img src="../images/orm_deployment_home_region.png" width="700">

**Step 1. Extend One-OE for DR**

> [!NOTE]
> Our One-OE blueprint uses `eu-frankfurt-1` as the home region. For the DR extension, we use `eu-amsterdam-1` as the DR region.

The DR environment may follow the same hub model and CIS security level as the primary environment, aligned with the One-OE Baseline configuration already deployed.

For a different region pair or DR topology, use the [OCI LZ Blueprint Factory](../../oci-lz-blueprint-factory/README.md) to create and review custom JSON configuration files.

> [!IMPORTANT]
> Create the BCDR stack in `eu-amsterdam-1` (Amsterdam). The deployment region is a Terraform or Resource Manager stack setting, not a field in the JSON configuration files. The regional resource keys and names in these files use the `AMS` prefix; the One-OE baseline uses `FRA` for Frankfurt.


| BCDR extension | Hub A | Hub B | Hub C | Hub E |
|---|---|---|---|---|
| CIS Level 1 | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_a_pre.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_b_pre.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_c_pre.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_e.json`<br>`oneoe_bcdr_observability_cis1_pre.json`<br>`oneoe_bcdr_security.json` |
| CIS Level 2 | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_a_pre.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_b_pre.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_c_pre.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` | [<img src="../../../commons/images/DeployToOCI.svg" height="25" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.1.1.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.json,https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json"})<br>`oneoe_bcdr_network_hub_e.json`<br>`oneoe_bcdr_observability_cis2_pre.json`<br>`oneoe_bcdr_security.json` |

**Step 1.1. Complete staged hub networking**

Hub A and Hub B initially deploy their `*_pre.json` network file. After the referenced hub resources are created and their private IP OCIDs have been reviewed, update the same ORM stack or Terraform state by replacing it with the matching final network file (`oneoe_bcdr_network_hub_a.json` or `oneoe_bcdr_network_hub_b.json`).

Hub C follows the same staged process. Use `oneoe_bcdr_network_hub_c.json` after updating the standard hub resource references, or `oneoe_bcdr_network_hub_c_backends.json` when the design uses third-party firewall backend resources.

Hub E deploys its complete network configuration in Step 1 and does not require a follow-up network replacement.

`oneoe_bcdr_security.json` deploys [Vulnerability Scanning Service (VSS)](https://docs.oracle.com/en-us/iaas/Content/scanning/using/overview.htm) recipes and targets in AMS. It is included in the initial BCDR stack and does not need a staged replacement.

Security Zones are not redeployed in Amsterdam. The One-OE baseline already associates the shared tenancy-wide compartment hierarchy with its Security Zones; OCI does not allow a compartment to belong to multiple Security Zones. Cloud Guard and Vaults likewise remain managed by the Frankfurt baseline.

**Step 1.2. Complete staged observability**

The initial deployment uses `oneoe_bcdr_observability_cis1_pre.json` or `oneoe_bcdr_observability_cis2_pre.json`. After the final hub network configuration is applied, update the same stack or Terraform state to use the matching final observability file (`oneoe_bcdr_observability_cis1.json` or `oneoe_bcdr_observability_cis2.json`). The final file creates the flow logs for the AMS hub and PROD network resources.

The BCDR observability files contain only regional AMS resources. The home-region events remain managed by the Frankfurt One-OE baseline and are intentionally excluded from the DR stack.

**Step 1.3. Configure Service Connector bucket replication**

> [!IMPORTANT]
> **Manual post-deployment configuration required:** the BCDR observability files create `bkt-ams-lz-service-connector` as the destination bucket. After both stacks are deployed, configure an Object Storage replication policy from the Frankfurt source bucket `bkt-fra-lz-service-connector` to that AMS destination. See [Object Storage replication](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingreplication.htm).

The AMS configuration intentionally creates no Service Connector. The replication destination becomes read-only while replication is active, so it cannot also be the local target of a Service Connector.

> [!NOTE]
> **CIS Level 2:** before deploying the AMS BCDR stack, replicate the Vault and the `KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY` key to Amsterdam. Provide the OCID of the AMS key replica through `kms_dependency.keys.KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY` so `bkt-ams-lz-service-connector` uses customer-managed encryption. See [Replicating Vaults and Keys](https://docs.oracle.com/en-us/iaas/Content/KeyManagement/Tasks/replicatingvaults.htm).

When deploying with ORM, follow these steps:

1. Select `eu-amsterdam-1` (Netherlands Northwest, Amsterdam) in the OCI Console, then accept terms and wait for the configuration to load.
2. Set the working directory to `rms-facade`.
3. Set the stack name you prefer.
4. Set the terraform version to 1.5.x. Click Next.
5. Accept the default files. Click Next. Optionally, replace with your reviewed JSON configuration files.
6. Configure the stack dependencies so the BCDR addon consumes the required outputs from the baseline One-OE stack.
7. Un-check run apply. Click Create.
8. Run Plan and review the proposed regional network and observability changes before applying.

**Step 2. Deploy inter-region RPC within the same tenancy**

After the One-OE BCDR addon is deployed, create the Remote Peering Connection (RPC) between the home-region DRG and the DR-region DRG inside the same tenancy.

Use the [OCI Remote Peering Connections addon](/addons/oci-x-rpc/README.md) to follow the required steps and automate this connectivity layer.

At a high level:

1. Create an RPC on the home-region DRG.
2. Create an RPC on the DR-region DRG.
3. Peer the two RPCs.
4. Update the required DRG route tables and VCN route tables in both regions.
5. Validate connectivity between the home-region and DR-region networks.

For deployable RPC examples and routing guidance, see the [OCI X-RPC runtime guide](/addons/oci-x-rpc/runtime/README.md).

For cross-region DR, manage each target region as an independent deployment unit. Use a distinct OCI Resource Manager stack or Terraform state/workspace per region so that regional network and observability resources can be planned, applied, and operated independently.

Do not redeploy or duplicate IAM and security baseline files in the secondary region. Reuse the home-region IAM and security model and deploy the regional network and observability files from this addon.

&nbsp;

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
