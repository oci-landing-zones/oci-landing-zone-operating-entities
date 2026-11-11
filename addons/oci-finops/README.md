# OCI FinOps Solution

The OCI FinOps Solution is an add-on to the OCI Operating Entities Landing Zone. It provides cost visibility, financial allocation and optimization insights by bringing FOCUS reports into Oracle Autonomous Database (ADB) and presenting them through Oracle Analytics Cloud (OAC).

The solution runs in an OCI **parent tenancy**. The current implementation is **V2**, with OCI as the provider implemented today; the modular architecture allows additional providers to be introduced.

**Contents**

- [Architecture](#architecture)
- [FinOps Tagging](#finops-tagging)
- [Installation](#installation)
- [License](#license)

## Architecture

The solution combines three layers:

1. **Ingestion:** loads FOCUS reports into ADB and reconciles rejected files and rows.
2. **Data preparation:** adds tags, account and contract context, with optional budgets, recommendations, anomalies and forecasts.
3. **Visualization:** publishes database reporting interfaces for OAC datasets and dashboards.

A shared Core coordinates provider processing, records execution status and sends operational notifications. The Landing Zone provides the infrastructure; database modules run inside ADB, while OAC provides the presentation service.

<img src="images/OCI_FinOps_Arch.png" width="900" alt="One-OE FinOps architecture with private Autonomous Database, Oracle Analytics Cloud, and an optional Object Storage bucket">

See [Design](design/README.md) for the solution's internal operation: component boundaries, data models, database objects and processing flows.

## FinOps Tagging

The FinOps tagging strategy complements the One-OE compartment hierarchy with consistent financial ownership and cost-allocation metadata. The add-on reuses the `tagns-lz-cost-governance` namespace provided and managed by One-OE.

| Tag | Purpose | Values |
| --- | --- | --- |
| `tag-lz-business-unit` | Business unit responsible for the resource and its costs. | Controlled list. |
| `tag-lz-cost-center` | Financial allocation code used to assign costs to a cost center. | Controlled list. |
| `tag-lz-platform` | Platform or service to which the resource belongs. | Controlled list. |
| `tag-lz-environment` | Environment associated with the resource. | Controlled list; optional on resources where the compartment hierarchy already provides the environment context. |
| `tag-lz-owner` | Email address of the responsible owner. | Manually entered email address. |
| `tag-lz-project` | Project to which the resource and its costs are assigned. | Manually entered project name. |

The namespace, tag definitions, controlled values and defaults belong to One-OE and must be prepared before deploying the add-on. FinOps consumes these existing tags for cost allocation and reporting. See the [tag catalog and reporting-profile design](design/02-oci-tags.md) for their use inside the platform.

## Installation

Follow the [complete FinOps setup guide](finops-setup/README.md), from provisioning infrastructure and ADB with IaC, through changing the ADMIN password and preparing Secrets, to installing database modules with Python or SQL and configuring OAC.

The guide defines the sequence and links to the detailed procedures.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
