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

**What is FinOps?** FinOps brings financial accountability to cloud usage through collaboration between engineering, finance and business teams, helping organizations make informed decisions about cost and value.

**Why this solution?** It complements OCI Cost Analysis with reporting tailored to the organization, tag-based cost allocation, long-term cost history and dashboards that users can access without the OCI Console.

## Architecture

### Workloads and Landing Zone integration

The FinOps workload integrates a private ADB and OAC reporting with the existing One-OE hub and shared services. Its dedicated VCN connects to the hub, with private subnets and network security groups separating database, OAC connectivity and infrastructure access.

OAC is a separate presentation service. Its private access channel connects to the private ADB endpoint; dashboard access is controlled separately through OAC endpoint configuration and application roles. The solution reuses One-OE's identity domain, hub and governance tags.

<img src="images/OCI_FinOps_Arch.png" width="900" alt="One-OE FinOps architecture with private Autonomous Database, Oracle Analytics Cloud, and an optional Object Storage bucket">

| Resource | Role |
| --- | --- |
| FinOps compartment | Groups the FinOps platform resources. |
| Database and OAC administrator groups | Separate service-administration responsibilities. |
| ADB Dynamic Group and IAM policies | Authorize database access to FOCUS reports and module APIs, plus administrator access to platform services. |
| VCN, private subnets and network security groups | Separate ADB, OAC connectivity and infrastructure access. |
| Service gateway and hub DRG attachment | Connect FinOps to regional OCI services and the existing Landing Zone hub. |
| Autonomous Database | Hosts ingestion, processing and database reporting objects behind a private endpoint. |
| Vault and encryption key | Provide the shared-security location for database password Secrets. |
| Notifications topic and email subscriptions | Deliver platform operational notifications to confirmed subscribers. |
| Optional central Bastion | Provides administrative access through the hub management subnet. |
| Database password Secrets | Store the current ADMIN password and the passwords for the FinOps owner and OAC reader. |
| OAC service and private access channel | Present dashboards and connect OAC to the private ADB endpoint. |

The IaC configurations provision the supporting infrastructure and ADB. Password Secrets and OAC are prepared separately. See the [infrastructure setup guide](finops-setup/README.md#step-1-setup-one-oe-landing-zone-with-finops-v2) for the configuration files, resource ownership and dependencies.

### Inside the database

The database solution combines three layers:

1. **Ingestion:** uses ADB's native pipelines, through `DBMS_CLOUD_PIPELINE`, to load FOCUS report files into landing tables. Database routines reconcile rejected files and rows.
2. **Data preparation:** makes existing tag data available for analysis, incorporates account and contract context, and provides optional budgets, recommendations, anomalies and forecasts.
3. **Reporting:** publishes database views and materialized views that OAC consumes as datasets for dashboards.

A shared Core coordinates provider processing, records execution status and sends operational notifications. Pipelines, processing routines and reporting objects run inside ADB.

See [Design](design/README.md) for the solution's internal operation: component boundaries, data models, database objects and processing flows.

## FinOps Tagging

The FinOps tagging strategy complements the One-OE compartment hierarchy with consistent financial ownership and cost-allocation metadata. The add-on reuses the `tagns-lz-cost-governance` namespace provided and managed by One-OE.

All six tags are **mandatory** and use **controlled lists of values defined in advance by the organization**. One-OE tag defaults can populate these required tags when resources are provisioned.

| Tag | Purpose |
| --- | --- |
| `tag-lz-business-unit` | Business unit responsible for the resource and its costs. |
| `tag-lz-cost-center` | Financial allocation code used to assign costs to a cost center. |
| `tag-lz-platform` | Platform or service to which the resource belongs. |
| `tag-lz-environment` | Environment associated with the resource. |
| `tag-lz-owner` | Email address of the responsible owner. |
| `tag-lz-project` | Project to which the resource and its costs are assigned. |

The namespace, tag definitions, controlled values and defaults belong to One-OE and must be prepared before deploying the add-on. FinOps consumes these existing tags for cost allocation and reporting. See the [tag catalog and reporting-profile design](design/02-oci-tags.md) for their use inside the platform.

## Installation

Follow the [complete FinOps setup guide](finops-setup/README.md), from provisioning infrastructure and ADB with IaC, through changing the ADMIN password and preparing Secrets, to installing database modules with Python or SQL and configuring OAC.

The guide defines the sequence and links to the detailed procedures.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
