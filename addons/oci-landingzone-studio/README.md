# **[OCI Landing Zone Studio](#)**
## **An OCI Open LZ [Addon](#) for visual Landing Zone design**

**[Open OCI Landing Zone Studio](https://oci-landing-zones.github.io/oci-landing-zone-operating-entities/)** in your browser. No installation or server is required. All design data and generated files remain stored locally in your browser profile.

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Design workflow](#2-design-workflow)<br>
[3. What Studio supports](#3-what-studio-supports)<br>
[4. Review and deployment](#4-review-and-deployment)<br>
[5. Security and data handling](#5-security-and-data-handling)<br>
[6. Complementary resources](#6-complementary-resources)<br>

&nbsp;

## 1. Overview

**OCI Landing Zone Studio** is a browser-based visual design tool for OCI Landing Zone Operating Entities. It guides an operator through a Landing Zone design, shows the resulting network as a live diagram, and creates a reviewable deployment package from the repository's Jsonnet generator.

Studio is designed for teams that want a guided alternative to editing configuration files by hand while keeping the design, generated files, and deployment decision under their own control.

> [!IMPORTANT]
> Studio is provided as-is and used at your own risk. Review every design, generated file, placeholder, route, security setting, and compliance requirement before deployment. Studio does not deploy resources to OCI and is not an Oracle-managed deployment service.

Studio complements the [OCI LZ Blueprint Factory](../oci-lz-blueprint-factory/README.md). Blueprint Factory provides the config-driven generation path; Studio provides a guided visual interface for creating and reviewing a supported config-driven design.

&nbsp;

## 2. Design workflow

Studio keeps one canonical Landing Zone model while you work. The wizard, JSON configuration, live network diagram, packet-flow trace, downloadable Draw.io diagram, and generated deployment files all derive from that same model.

1. **Start a design**: choose a design name, an optional description, OCI region and realm, the CIS baseline, and optional One-OE notification recipients. Descriptions appear below the design name on the dashboard and are retained when a design is reopened or duplicated. They are local design notes and are not included in the deployment configuration. Configure Cloud Guard, IAM, Network, and Security separately, or select one email list for all four. The Network recipient also covers ExaCS network notifications.
1. **Design the hub network**: select a Hub A, B, C, or E layout and review the VCN, subnets, gateways, DRG, and attachments.
1. **Add environments and projects**: define environment networks and the projects that need to be represented in each environment.
1. **Add platforms**: use the separate Shared Platforms and Environment Platforms panels. Both type dropdowns include Custom, OCVS, EXACC, and EXACS; OKE is also available for environment platforms. Shared Exadata infrastructure is fixed to shared placement; its VMC dropdown selects shared or dedicated-per-environment placement. Choosing dedicated VMCs automatically shows a linked card in Environment Platforms. The shared infrastructure card controls placement and shared notification recipients; VMC/AVMC services, environment selection, networks, project tiers, and per-environment recipients are configured in the linked environment card. Exadata added directly in Environment Platforms has infrastructure and VMC placement fixed to dedicated per environment, shown as plain text. A linked environment card names Shared Platforms as its infrastructure source. Use the trash icon in an Exadata card header to remove the platform, including its linked card. Settings are retained when re-added, and a type cannot be added twice. OKE and OCVS validation also runs before generation in Review.
   **Exadata options**: EXACC and EXACS start disabled. Studio identifies the resulting UC1 shared, UC2 hybrid, or UC3 dedicated scenario from the platform panel and VMC placement. VMC and AVMC both start unchecked in each extension; select either or both to continue. Autonomous project tiers appear only when AVMC is selected. Configure separate infrastructure and DBA recipients for each topic in the selected use case. Autonomous project recipients appear only when a project tier is selected. Use one email for all notifications is selected by default for new Exadata platforms. In a hybrid design this option and the common email are managed in Shared Platforms; the linked environment card displays that email as text. Clear it to configure recipients by topic in the card that owns them. Existing saved choices are retained. Add CIDRs for ExaCS VMC/AVMC networks as needed. The diagram shows generated platform child compartments and selected Autonomous project DB compartments.
1. **Review and export**: download one ZIP containing `config.jsonnet` and the generated deployment files. Export the structural diagram as a `.drawio` file when you need to continue diagramming outside Studio.

To continue a previously exported design, select **Import existing Landing Zone** next to **New Landing Zone** on the dashboard. The import window explains which file to choose: extract the ZIP downloaded in Review and select its **`config.jsonnet`** file (up to 1 MB). Studio validates it locally, shows a summary, and lets you name the new design before importing it. Existing saved designs are kept; generated deployment outputs must be regenerated in Review.

Import supports standalone configuration files exported by Studio. Files with unsupported settings or external imports are rejected rather than silently dropping values. Exadata exports do not record the VMC/AVMC service selection: review those choices in Platforms after import. Autonomous project tiers restore the required AVMC selection; where no tiers establish a service choice, the service selection remains empty until you choose it.

Each saved design also has a **Download draw.io** action on the dashboard, next to **Download LZ config** when a current deployment ZIP is available. The diagram reflects the saved design and can be downloaded before generating a deployment ZIP.

**Add Disaster Recovery** opens a source-selection window with two options: choose a saved Landing Zone or load its standalone `config.jsonnet`. **Next** becomes available after a source is selected and validated. The next window has two columns: **Home region** shows the existing configuration as a read-only reference; **DR region** lets you select a different region in the same realm. Under **Network → One-OE**, choose the DR hub and Projects VCNs. **Workload Extensions (Platforms)** lists existing shared and environment platforms for optional inclusion. Networkless Exadata scopes do not receive a VCN. Home CIDRs are references; configure non-overlapping DR networks. **Next** opens the file-generation screen with Home, optional RPC update, and regional DR deployment steps. **Save** creates a separate **Home + DR** design, including **+ RPC** when selected, and retains generated files in browser storage when available. The original Home design is preserved. On the dashboard, **Open** restores the DR assistant; **Download LZ config** and **Download LZ DR config** provide separate Home and DR packages, generating them on demand if needed. **Download draw.io** exports the combined diagram. Saving an opened combined design updates that entry.

In the DR assistant, OCVS and OKE settings are inherited from Home and can be edited independently for each selected platform and environment. Both columns show network/subnet details before a collapsible cluster-configuration section. OCVS derives its provisioning subnet from the editable VCN. OKE supports editable manual subnets or generator-owned Small, Medium and Large profiles. The OKE Prod DR reservation is `10.0.216.0/21`, using manual subnets because Small requires `/20`; Preprod starts at `10.0.248.0/21`. All ranges are editable and validated for overlaps. Enabling OKE public load balancer or File Storage support in DR requires the corresponding IAM prerequisites to have been configured and applied through Home. Studio blocks generation if those Home options are absent.

Studio's initial One-OE address plan uses the following reservations. These are suggestions for new networks; operators can edit CIDRs and saved designs retain their existing values.

| Environment | Projects VCN | OCVS reservation | ExaCS reservation |
|---|---|---|---|
| Prod | `10.0.64.0/21` | `10.0.88.0/21` | `10.0.104.0/21` |
| Preprod | `10.0.128.0/21` | `10.0.152.0/21` | `10.0.168.0/21` |
| DR | `10.0.200.0/21` | `10.0.224.0/22` | `10.0.240.0/22` |
| Dev | `10.1.64.0/21` | `10.1.88.0/21` | `10.1.104.0/21` |
| UAT | `10.1.128.0/21` | `10.1.152.0/21` | `10.1.168.0/21` |

Names are matched without case sensitivity. Shared ExaCS starts at `10.0.24.0/21`. Optional shared Custom/OCVS networks use free `/21` blocks from `10.0.32.0/19`. Custom environment networks use that environment's optional slots; OCVS tries its reserved slot first, then the optional slots if it is occupied. The catalog also retains EBS, AI, and OKE reservations without creating those resources.

Other environment names share the `10.1.192.0/18` pool. Each new Projects, Custom, OCVS, or environment ExaCS VCN consumes a separate free `/21` block from its eight available blocks. `10.1.0.0/18` remains unallocated by these defaults. An exhausted pool leaves the CIDR empty and requires a manual allocation before generation.

OKE keeps its existing allocation: the first platform starts at `10.0.80.0/20` for the `small` profile, with the existing per-platform and per-environment shifts. This can overlap a catalog reservation, including Prod OCVS; Studio checks configured networks for overlaps, so reservations alone do not guarantee a deployable combination.

The diagram grows with the wizard. In diagram-only view, Studio can show route tables, example endpoints, and packet paths for supported traffic flows. This gives network and security reviewers a way to inspect the intended path before deployment.

&nbsp;

## 3. What Studio supports

Studio currently provides a guided interface for the following repository-supported design choices:

| Area | Supported choices |
|---|---|
| Landing Zone baseline | One-OE config-driven generation |
| Hub network | Hub A, Hub B, Hub C, and Hub E |
| Environments | Environment networks, optional OCI Security Zones, and projects |
| Platforms | Environment OKE (`oke_simple`), OCVS, Custom, EXACC, and EXACS platforms; shared OCVS, Custom, EXACC, and EXACS platforms. Choose a type from each panel's dropdown. |
| Exadata fields | Shared, hybrid, and dedicated EXACC/EXACS selections map to UC1, UC2, and UC3; EXACC stays networkless, while EXACS creates networks where AVMC/VMCs are placed. |
| Outputs | Generated deployment ZIP, `config.jsonnet`, live diagram, and Draw.io export |

Hub A, B, and C use the final `network.json`; managed firewall and NLB route targets resolve by resource key. The package retains the security and observability pre/final files. Hub C still requires real third-party firewall backend targets in place of the generated external placeholders; see the [Hub C backend contract](../oci-hub-models/hub_c/readme.md#backend-targets).

Studio intentionally does not replace the Landing Zone framework contract. A resource, topology, or behavior not supported by the generator must be handled as a separate manual post-deployment activity, with customer ownership for lifecycle, drift, and compliance review.

&nbsp;

## 4. Review and deployment

The Studio download is a deployment input, not an automatic deployment. The ZIP contains the design configuration and the complete set of generated JSON artifacts for that snapshot. Review it in your normal architecture, network, security, and change-management processes.

Before deployment:

- Confirm region, realm, environment names, CIDRs, connectivity assumptions, and workload placement.
- Confirm CIDRs do not overlap with OCI, on-premises, or other-cloud networks that require routed connectivity.
- Review IAM, compartment, security, governance, and observability outputs.
- Resolve every generated placeholder and follow the security and observability pre/final workflow.
- Store source configuration and generated artifacts in a private, organization-controlled location.

Use Terraform locally or from customer-controlled CI/CD where possible. If you use OCI Resource Manager, stage the artifacts in a private Object Storage bucket or approved private source repository controlled by your organization.

Studio's **Deploy to OCI** link opens the Create Stack page with the latest released Orchestrator and the private Object Storage configuration source prefilled. Set the working directory to `rms-facade`, provide the bucket and current phase's file values, and review the plan before applying.

For deployment details, use the [Terraform deployment guide](../../commons/content/terraform.md) or [OCI Resource Manager deployment guide](../../commons/content/orm.md).

&nbsp;

## 5. Security and data handling

Studio runs entirely in the browser. It does not request OCI credentials, deploy to OCI, or send Landing Zone models or generated files to a service. Designs and the latest generated ZIP snapshot are retained only in the active browser profile using local storage.

Use a browser profile controlled by the intended operator, and do not enter secrets into Studio. A downloaded ZIP remains usable if browser storage is unavailable, but the design may not be retained locally. Treat exported files as sensitive deployment artifacts and store them accordingly.

Studio displays a UPL license notice at the bottom of the dashboard. Your organization's architecture, security, compliance, and deployment approvals still apply.

&nbsp;

## 6. Complementary resources

| Resource | Purpose |
|---|---|
| [OCI LZ Blueprint Factory](../oci-lz-blueprint-factory/README.md) | Config-driven Landing Zone generation and examples. |
| [OCI LZ AI Agent](../oci-lz-ai-agent/README.md) | AI-assisted discovery and config drafting guidance. |
| [One-OE runtime documentation](../../blueprints/one-oe/runtime/one-stack/readme.md) | Published One-OE deployment reference. |
| [OCI Network Hubs](../oci-hub-models/readme.md) | Hub A, B, C, and E guidance. |
| [Workload Extensions](../../workload-extensions/readme.md) | Published workload-extension entry point. |

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
