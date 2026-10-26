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

1. **Start a design**: choose a design name, OCI region and realm, deployment type, the CIS baseline, and One-OE notification recipients. Configure Cloud Guard, IAM, Network, and Security separately, or select one email list for all applicable topics. Regional DR uses Network and Security topics. The Network recipient also covers ExaCS network notifications.
1. **Design the hub network**: select a Hub A, B, C, or E layout and review the VCN, subnets, gateways, DRG, and attachments.
   Subnet CIDRs must fit inside their VCN and must not overlap. Invalid subnet rows offer an available replacement CIDR; applying it changes that subnet only. Review blocks downloads until the network ranges are valid. The same editor is used for hub, environment and custom-platform networks.
1. **Add environments and projects**: define environment networks and projects when needed. Environments are optional for hub and shared-services designs; an environment may also use platform networks without a Projects VCN.
1. **Add platforms**: use the separate Shared Platforms and Environment Platforms panels. Both type dropdowns include Custom, EXACC, and EXACS; OKE is also available for environment platforms. Shared Exadata infrastructure is fixed to shared placement; its VMC dropdown selects shared or dedicated-per-environment placement. Choosing dedicated VMCs automatically shows a linked card in Environment Platforms. The shared infrastructure card controls placement and shared notification recipients; VMC/AVMC services, environment selection, networks, project tiers, and per-environment recipients are configured in the linked environment card. Exadata added directly in Environment Platforms has infrastructure and VMC placement fixed to dedicated per environment, shown as plain text. A linked environment card names Shared Platforms as its infrastructure source. Use the trash icon in an Exadata card header to remove the platform, including its linked card. Settings are retained when re-added, and a type cannot be added twice. OKE validation also runs before generation in Review.
   **Exadata options**: EXACC and EXACS start disabled. Studio identifies the resulting UC1 shared, UC2 hybrid, or UC3 dedicated scenario from the platform panel and VMC placement. VMC and AVMC both start unchecked in each extension; select either or both to continue. Autonomous project tiers appear only when AVMC is selected. Configure separate infrastructure and DBA recipients for each topic in the selected use case. Autonomous project recipients appear only when a project tier is selected. Use one email for all notifications is selected by default for new Exadata platforms. In a hybrid design this option and the common email are managed in Shared Platforms; the linked environment card displays that email as text. Clear it to configure recipients by topic in the card that owns them. Existing saved choices are retained. Add CIDRs for ExaCS VMC/AVMC networks as needed. The diagram shows generated platform child compartments and selected Autonomous project DB compartments.
1. **Review and export**: download one ZIP containing `config.jsonnet` and deployment files regenerated from the current Blueprint Factory. Export the diagram as a `.drawio` file when you need to continue diagramming outside Studio. The export retains the layers selected in Diagram view, including route tables, endpoints and static flow paths.

To continue a previously exported design, select **Import** next to **New Landing Zone** on the dashboard. The import window explains which file to choose: extract the ZIP downloaded in Review and select its **`config.jsonnet`** file (up to 1 MB). Studio validates it locally, shows a summary, and lets you name the new design before importing it. Existing saved designs are kept; generated deployment outputs must be regenerated in Review.

Import supports standalone configuration files exported by Studio. Files with unsupported settings or external imports are rejected rather than silently dropping values. Exadata exports do not record the VMC/AVMC service selection: review those choices in Platforms after import. Autonomous project tiers restore the required AVMC selection; where no tiers establish a service choice, the service selection remains empty until you choose it.

**New Landing Zone** opens Foundation directly with the default Frankfurt region, prod and preprod environments, and proj1 project. Environments are optional: remove them all for a hub and shared-services design. Set **Deployment type**, above the region controls, to **Complete** or **DR** (Disaster Recovery). Region short name is filled from the selected region and can be edited beside it, with a maximum of three characters. Choose **Create DR** on a complete design's saved card to retain its inputs in a linked DR design. Its environment names and membership sync automatically from Home and are read-only in DR; regional networks remain editable. **Open Home Region** opens the source design in a new tab. The link applies to designs saved in this browser; imported or newly created standalone DR designs keep editable environments. Both deployment types use the standard Foundation, Hub Network, Projects, Platforms and Review flow. Review retained platform settings and CIDRs for the target region.

Regional DR reuses the Home stack's compartments, IAM and governance. In Foundation, choose Home and DR regions in the same realm; linked DR designs take their Home Region and realm from the source. Review's deployment steps explain the Home prerequisites: select the DR region in the complete Home design to grant DR Object Storage access to Home encryption keys, deploy Home first, then supply its dependency outputs to a separate DR stack/state. Regional downloads exclude IAM, governance, Cloud Guard and Security Zones and retain regional security and observability resources. Saved regional designs are labelled **DR**. Diagram export is available only in **Review**.

Configure **Remote peering connection (RPC)** in Hub Network. Each connection needs a unique name, peer region and reviewed remote VCN CIDRs. Requesters also need the acceptor RPC OCID or an Orchestrator network dependency key. Deploy acceptors first and review routes and firewall policies on both sides. Regional DR supports same-tenancy peering. Complete deployments also support cross-tenancy peering: acceptors require the foreign requester tenancy and network-administrator group OCIDs; requesters require the acceptor tenancy OCID.

Import restores regional scope and RPC connections when present in a supported standalone configuration. Choose the Home region after importing a regional design and follow Review's deployment steps. Older combined Home + DR designs open in the standard regional editor when their settings can be represented; the original combined source is retained when edits are saved. Designs with unrepresentable legacy settings are kept intact and display a review message.

Studio's initial One-OE address plan uses the following reservations. These are suggestions for new networks; operators can edit CIDRs and saved designs retain their existing values.

| Environment | Projects VCN | ExaCS reservation |
|---|---|---|
| Prod | `10.0.64.0/21` | `10.0.104.0/21` |
| Preprod | `10.0.128.0/21` | `10.0.168.0/21` |
| DR | `10.0.200.0/21` | `10.0.240.0/22` |
| Dev | `10.1.64.0/21` | `10.1.104.0/21` |
| UAT | `10.1.128.0/21` | `10.1.168.0/21` |

Names are matched without case sensitivity. Shared ExaCS starts at `10.0.24.0/21`. Optional shared Custom networks use free `/21` blocks from `10.0.32.0/19`. Custom environment networks use that environment's optional slots. The catalog also retains EBS, AI, and OKE reservations without creating those resources.

Other environment names share the `10.1.192.0/18` pool. Each new Projects, Custom, or environment ExaCS VCN consumes a separate free `/21` block from its eight available blocks. `10.1.0.0/18` remains unallocated by these defaults. An exhausted pool leaves the CIDR empty and requires a manual allocation before generation.

OKE keeps its existing allocation: the first platform starts at `10.0.80.0/20` for the `small` profile, with the existing per-platform and per-environment shifts. Studio checks configured networks for overlaps; reservations alone do not guarantee a deployable combination.

The diagram grows with the wizard. In diagram-only view, Studio can show route tables, example endpoints, and packet paths for supported traffic flows. This gives network and security reviewers a way to inspect the intended path before deployment.

The [diagram design rules](DIAGRAM-DESIGN.md) define composition, readable sizing, colors, resource ownership and routing consistency. Studio's test suite checks those rules across representative configurations and visible layers.

Events, vaults, vulnerability scanning recipes, notifications, VCN flow log groups and Security Zone recipes are listed inside their owning compartments. Their names and compartment references come from the selected final Blueprint Factory outputs, including CIS and DR filtering. Adding or renaming resources in those generated collections updates the diagram automatically. The website and Draw.io export use the same measured resource blocks, icons and line wrapping.

Route tables and their subnet, gateway, VCN-ingress and DRG-attachment associations come from the evaluated Blueprint Factory network configuration. DRG import distributions provide expected route advertisements; remote prefixes come from the supplied peer CIDRs. These are configuration previews, not live learned routes. Designs without Projects VCNs can use **Show routing tables** without selecting a packet flow.

Packets follow the same connection geometry as the structural diagram, including repeated attachment visits. Each numbered hop uses one processing anchor on that path for its marker, packet pause and effective-rule highlight. Routing anchors come from the table's resource association; component entry and exit remain on the path. Manual stepping holds the same anchor, and reduced-motion mode uses static steps. Draw.io downloads retain the same table inventory, processing anchors and connection geometry as a static diagram, without an animation phase.

Hub E shows direct DRG routing without firewall inspection, local spoke NAT gateways for internet egress, and local service gateways for OCI Services. Its DRG preview derives dynamic routes from configured subnets, matching the default [VCN attachment route advertisement](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-create-attachment.htm). When an OKE extension suppresses the hub load balancer in the generator, Studio omits that load balancer and its ingress flow choices. Flow traces describe routing paths; they do not verify deployed backends or security policy reachability.

&nbsp;

## 3. What Studio supports

Studio currently provides a guided interface for the following repository-supported design choices:

| Area | Supported choices |
|---|---|
| Landing Zone baseline | One-OE config-driven generation |
| Hub network | Hub A, Hub B, Hub C, and Hub E |
| Environments | Environment networks, optional OCI Security Zones, and projects |
| Platforms | Environment OKE (`oke_simple`), Custom, EXACC, and EXACS platforms; shared Custom, EXACC, and EXACS platforms. Choose a type from each panel's dropdown. |
| Exadata fields | Shared, hybrid, and dedicated EXACC/EXACS selections map to UC1, UC2, and UC3; EXACC stays networkless, while EXACS creates networks where AVMC/VMCs are placed. |
| Outputs | Generated deployment ZIP, `config.jsonnet`, live diagram, and Draw.io export |
| Deployment scope | Complete or regional DR using the standard wizard |
| Remote peering | Multiple RPC acceptor/requester connections; same tenancy for regional DR, same or cross tenancy for complete deployments |

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
