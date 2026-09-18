# **[OCI Landing Zone Studio](#)**
## **An OCI Open LZ [Addon](#) for visual Landing Zone design**

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

1. **Start a design**: choose a design name, OCI region and realm, and the CIS baseline.
1. **Design the hub network**: select a Hub A, B, C, or E layout and review the VCN, subnets, gateways, DRG, and attachments.
1. **Add environments and projects**: define environment networks and the projects that need to be represented in each environment.
1. **Add platforms**: add supported OKE, OCVS, or custom platforms. Shared custom and OCVS platforms can also be included.
1. **Review and export**: download one ZIP containing `config.jsonnet` and the generated deployment files. Export the structural diagram as a `.drawio` file when you need to continue diagramming outside Studio.

The diagram grows with the wizard. In diagram-only view, Studio can show route tables, example endpoints, and packet paths for supported traffic flows. This gives network and security reviewers a way to inspect the intended path before deployment.

&nbsp;

## 3. What Studio supports

Studio currently provides a guided interface for the following repository-supported design choices:

| Area | Supported choices |
|---|---|
| Landing Zone baseline | One-OE config-driven generation |
| Hub network | Hub A, Hub B, Hub C, and Hub E |
| Environments | Environment networks, optional OCI Security Zones, and projects |
| Platforms | Environment OKE (`oke_simple`), OCVS, and custom platforms; shared OCVS and custom platforms |
| Outputs | Generated deployment ZIP, `config.jsonnet`, live diagram, and Draw.io export |

Hub A, B, and C are staged network deployments. The downloaded package preserves the required `*_pre.json` and final files together. Before the final network phase, resolve the generated firewall or load-balancer private-IP-OCID placeholders as described in the review screen and the selected hub documentation.

Studio intentionally does not replace the Landing Zone framework contract. A resource, topology, or behavior not supported by the generator must be handled as a separate manual post-deployment activity, with customer ownership for lifecycle, drift, and compliance review.

&nbsp;

## 4. Review and deployment

The Studio download is a deployment input, not an automatic deployment. The ZIP contains the design configuration and the complete set of generated JSON artifacts for that snapshot. Review it in your normal architecture, network, security, and change-management processes.

Before deployment:

- Confirm region, realm, environment names, CIDRs, connectivity assumptions, and workload placement.
- Confirm CIDRs do not overlap with OCI, on-premises, or other-cloud networks that require routed connectivity.
- Review IAM, compartment, security, governance, and observability outputs.
- Resolve every generated placeholder and follow the required staged network workflow.
- Store source configuration and generated artifacts in a private, organization-controlled location.

Use Terraform locally or from customer-controlled CI/CD where possible. If you use OCI Resource Manager, stage the artifacts in a private Object Storage bucket or approved private source repository controlled by your organization.

For deployment details, use the [Terraform deployment guide](../../commons/content/terraform.md) or [OCI Resource Manager deployment guide](../../commons/content/orm.md).

&nbsp;

## 5. Security and data handling

Studio runs entirely in the browser. It does not request OCI credentials, deploy to OCI, or send Landing Zone models or generated files to a service. Designs and the latest generated ZIP snapshot are retained only in the active browser profile using local storage.

Use a browser profile controlled by the intended operator, and do not enter secrets into Studio. A downloaded ZIP remains usable if browser storage is unavailable, but the design may not be retained locally. Treat exported files as sensitive deployment artifacts and store them accordingly.

The first visit displays a disclaimer that must be accepted before using the tool. This does not replace your organization's architecture, security, compliance, or deployment approvals.

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
