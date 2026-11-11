# OCI FinOps Solution

The OCI FinOps Solution is an add-on to the OCI Operating Entities Landing Zone. It provides cost visibility, financial allocation and optimization insights by bringing FOCUS reports into Oracle Autonomous Database (ADB) and presenting them through Oracle Analytics Cloud (OAC).

The solution runs in an OCI **parent tenancy**. The current implementation is **V2**, with OCI as the provider implemented today; the modular architecture allows additional providers to be introduced.

**Contents**

- [Architecture](#architecture)
  - [Workloads and Landing Zone integration](#workloads-and-landing-zone-integration)
  - [Inside the database](#inside-the-database)
- [FinOps Tagging](#finops-tagging)
- [Installation](#installation)
- [License](#license)

## Architecture

### Workloads and Landing Zone integration

The FinOps workload integrates a private ADB and OAC reporting with the existing One-OE hub and shared services.

| Resource | Role | How it is provided |
| --- | --- | --- |
| FinOps compartment | Groups the FinOps platform resources. | IaC: [finops_iam.json](deployment/finops_iam.json). |
| Database and OAC administrator groups | Separate service-administration responsibilities. | IaC: [finops_iam.json](deployment/finops_iam.json), using the existing identity domain. |
| ADB Dynamic Group and IAM policies | Authorize database access to FOCUS reports and module APIs, plus administrator access to platform services. | IaC: [finops_iam.json](deployment/finops_iam.json). |
| VCN, private subnets and network security groups | Separate ADB, OAC connectivity and infrastructure access. | IaC: [finops_network.json](deployment/finops_network.json). |
| Service gateway and hub DRG attachment | Connect FinOps to regional OCI services and the existing Landing Zone hub. | IaC: [finops_network.json](deployment/finops_network.json); hub routing remains managed by One-OE. |
| Autonomous Database | Hosts ingestion, processing and database reporting objects behind a private endpoint. | IaC: [finops_database.json](deployment/finops_database.json). |
| Vault and encryption key | Provide the shared-security location for database password Secrets. | IaC: [finops_security.json](deployment/finops_security.json). |
| Notifications topic and email subscriptions | Deliver platform operational notifications to confirmed subscribers. | IaC: [finops_observability.json](deployment/finops_observability.json). |
| Optional central Bastion | Provides administrative access through the hub management subnet. | IaC: [finops_bastion.json](deployment/finops_bastion.json), when an existing Bastion is not reused. |
| Database password Secrets | Store the current ADMIN password and the passwords for the FinOps owner and OAC reader. | Prepared separately after infrastructure creation; see the [setup guide](finops-setup/README.md#step-3-prepare-database-credentials-and-secrets). |
| OAC service and private access channel | Present dashboards and connect OAC to the private ADB endpoint. | Configured separately from the IaC files. |

The solution reuses One-OE's identity domain, hub and governance tags.

OAC is a separate presentation service, configured outside these IaC files. Its private access channel connects to the private ADB endpoint; dashboard access is controlled separately through OAC endpoint configuration and application roles.

<img src="images/OCI_FinOps_Arch.png" width="900" alt="One-OE FinOps architecture with private Autonomous Database, Oracle Analytics Cloud, and an optional Object Storage bucket">

### Inside the database

The database solution combines three layers:

1. **Ingestion:** uses ADB's native pipelines, through `DBMS_CLOUD_PIPELINE`, to load FOCUS report files into landing tables. Database routines reconcile rejected files and rows.
2. **Data preparation:** adds tags, account and contract context, with optional budgets, recommendations, anomalies and forecasts.
3. **Reporting:** publishes database views and materialized views that OAC consumes as datasets for dashboards.

A shared Core coordinates provider processing, records execution status and sends operational notifications. Pipelines, processing routines and reporting objects run inside ADB.

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
