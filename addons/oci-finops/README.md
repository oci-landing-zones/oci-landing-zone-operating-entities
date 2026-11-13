# OCI FinOps Add-on
## An OCI Open LZ Add-on for Cloud Cost Visibility, Allocation and Optimization

&nbsp;

**Contents**

- [OCI FinOps Add-on](#oci-finops-add-on)
  - [An OCI Open LZ Add-on for Cloud Cost Visibility, Allocation and Optimization](#an-oci-open-lz-add-on-for-cloud-cost-visibility-allocation-and-optimization)
  - [Overview](#overview)
    - [Example dashboards](#example-dashboards)
  - [Architecture](#architecture)
    - [Infrastructure and Landing Zone integration](#infrastructure-and-landing-zone-integration)
    - [Database processing and reporting](#database-processing-and-reporting)
  - [FinOps Tagging](#finops-tagging)
  - [Installation](#installation)
  - [License](#license)

## Overview

The **OCI FinOps Add-on** extends the One-OE blueprint of the OCI Operating Entities Landing Zone with cost governance, financial allocation and cloud cost optimisation. Designed to support multicloud FinOps through FOCUS reports and additional data sources, the current implementation integrates OCI data in **Oracle Autonomous Database (ADB)** and presents it through **Oracle Analytics Cloud (OAC)**. Other providers can be integrated by extending the ingestion and data mappings.

The default dashboards support executives, finance and business owners, FinOps practitioners, engineering teams and auditors, providing a shared view of cloud spending, cost allocation and optimisation opportunities.

The add-on uses existing Landing Zone governance tags to associate costs with business units, cost centres, owners, platforms, environments and projects, supporting showback and chargeback analysis.

The modular data model and dashboards can be extended or customised to meet organisational needs. Optional **OAC AI Assistant** capabilities help users explore reporting data through natural-language questions.

**What is FinOps?** FinOps is a collaborative practice that brings engineering, finance and business teams together to understand cloud spending, take ownership of costs and maximize the business value of cloud investments.

**Why this solution?** Understanding cloud spending requires connecting cost and usage data with business ownership and operational context. This add-on combines OCI FOCUS reports with Landing Zone tags and account information to help teams assign costs consistently, investigate spending and identify optimization opportunities.

The add-on runs in an OCI **parent tenancy**.

### Example dashboards

<p align="center">
  <a href="images/oac-overview.png">
    <img src="images/oac-overview.png" width="650" alt="OAC Overview dashboard showing cloud costs, commitment, monthly consumption, services, compartments and regions">
  </a>
  <br>
  <em>Overview — spending by tenancy, region and service.</em>
</p>

<p align="center">
  <a href="images/oac-monthly-comparison.png">
    <img src="images/oac-monthly-comparison.png" width="650" alt="OAC Monthly Comparison dashboard showing monthly costs, daily comparison and cost changes by service, tag, compartment and resource">
  </a>
  <br>
  <em>Monthly comparison — cost changes between periods.</em>
</p>

Select an image to view it at full size.

## Architecture

The OCI FinOps Add-on extends the Landing Zone foundation deployed using the [**One-OE blueprint templates**](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/blueprints/one-oe/runtime/one-stack/readme.md). Its architecture combines dedicated FinOps infrastructure, shared Landing Zone services and database modules that prepare cost and usage data for reporting.

The following sections describe how the add-on integrates with the Landing Zone and how data flows through the platform.

### Infrastructure and Landing Zone integration

A dedicated FinOps VCN connects to the existing One-OE hub. Private subnets and network security groups separate database, OAC connectivity and infrastructure access. The add-on reuses One-OE's identity domain and governance tags.

OAC is a separate presentation service. Its private access channel connects to the private ADB endpoint; dashboard access is controlled separately through OAC endpoint configuration and application roles.

<img src="images/OCI_FinOps_Arch.png" width="900" alt="One-OE FinOps architecture with private Autonomous Database, Oracle Analytics Cloud, and an optional Object Storage bucket">

| Resource | Purpose | Provisioning |
| --- | --- | --- |
| **FinOps compartment** | Dedicated compartment for the FinOps database and platform services. | Created by the add-on IaC. |
| **Identity domain** | Hosts the FinOps administration groups and ADB dynamic group. | Reused from One-OE. |
| **IAM groups** | Separate database and OAC administration groups. | Created by the add-on IaC in the existing identity domain. |
| **IAM policies and ADB dynamic group** | Provide administrator access and resource-principal permissions for ADB to read FOCUS reports, query module APIs and publish operational notifications. See the [IAM policy reference](installation-guide/infrastructure/iam-policies.md). | Created by the add-on IaC. |
| **Autonomous Database (ADB)** | Private data store where pipelines ingest FOCUS reports and database modules prepare reporting data. | Created by the add-on IaC; database modules are installed separately. |
| **Oracle Analytics Cloud (OAC)** | Presents dashboards and reports, using a private access channel to connect to ADB. | Created or reused separately; connectivity, datasets and dashboards are configured after infrastructure provisioning. |
| **VCN and subnets** | Private networking for ADB, OAC connectivity and infrastructure access, with network security groups, a service gateway and a DRG attachment to the One-OE hub. | Created by the add-on IaC, using existing hub dependencies. |
| **Tags** | Financial ownership and cost-allocation metadata in `tagns-lz-cost-governance`. See [FinOps Tagging](#finops-tagging). | Namespace, definitions and defaults reused from One-OE. |
| **Object Storage bucket (optional)** | Customer-managed source for FOCUS reports, as an alternative to Oracle-managed report storage. | Supplied separately from the add-on IaC. |
| **Vault and encryption key** | The Vault stores the password Secrets; the key encrypts them. | Created by the add-on IaC in the shared security compartment. |
| **Password Secrets** | Store the ADMIN, FinOps schema-owner and OAC-reader passwords. | Prepared separately after infrastructure provisioning. |
| **Notifications** | Topic and email subscriptions for platform operational notifications. | Created by the add-on IaC; recipients confirm their subscriptions. |
| **Bastion (optional)** | Administrative access to private endpoints through a central Bastion in shared security. | Created by the add-on IaC when needed, or an existing managed central Bastion is reused. |

See the [Landing Zone extension deployment guide](deployment/FinOps_LandingZone_addon/README.md) for infrastructure provisioning, resource ownership and dependencies. Follow the [FinOps configuration guide](installation-guide/README.md) for database credentials, Secrets and database module installation.

### Database processing and reporting

The database solution combines three layers:

1. **Ingestion:** uses ADB's native pipelines, through `DBMS_CLOUD_PIPELINE`, to load FOCUS report files into landing tables. Database routines reconcile rejected files and rows.
2. **Data preparation:** makes existing tag data available for analysis, incorporates account and contract context, and provides optional budgets, recommendations, anomalies and forecasts.
3. **Reporting:** publishes database views and materialized views that OAC consumes as datasets for dashboards.

A shared Core coordinates provider processing, records execution status and sends operational notifications. Pipelines, processing routines and reporting objects run inside ADB.

The platform separates a provider-neutral shared Core, cloud-provider modules and visualization modules, allowing them to evolve independently while respecting their dependencies. OAC is the default visualization tool.

See [Design](design/README.md) for the solution's internal operation: component boundaries, data models, database objects and processing flows.

## FinOps Tagging

The FinOps tagging strategy complements the One-OE compartment hierarchy with consistent financial ownership and cost-allocation metadata. The add-on uses the `tagns-lz-cost-governance` namespace provided and managed by One-OE.

All six tags are **mandatory** and use **controlled lists of values defined in advance by the organization**. One-OE tag defaults can populate these required tags when resources are provisioned.

| Tag | Purpose |
| --- | --- |
| `tag-lz-business-unit` | Business unit responsible for the resource and its costs. |
| `tag-lz-cost-center` | Financial allocation code used to assign costs to a cost center. |
| `tag-lz-platform` | Platform or service to which the resource belongs. |
| `tag-lz-environment` | Environment associated with the resource. |
| `tag-lz-owner` | Email address of the responsible owner. |
| `tag-lz-project` | Project to which the resource and its costs are assigned. |

<p align="center">
  <a href="images/FinOps_tags.png">
    <img src="images/FinOps_tags.png" width="900" alt="Illustrative One-OE compartment hierarchy showing six financial ownership tags across shared services, platforms and projects, with compartment-based and tag-based budget examples">
  </a>
  <br>
  <em>Illustrative One-OE tag allocation and budget scopes. Labels and values are examples.</em>
</p>

The namespace, tag definitions, controlled values and defaults belong to One-OE and must be prepared before deploying the add-on. FinOps consumes these existing tags for cost allocation and reporting. See the [tag catalog and reporting-profile design](design/02-oci-tags.md) for their use inside the platform.

## Installation

Set up the FinOps add-on in four stages. The FinOps add-on extends an existing Landing Zone; it does not deploy the One-OE foundation.

1. **Prerequisite — deploy the One-OE Landing Zone.** Deploy the base Landing Zone in the OCI parent tenancy using the [One-OE blueprint templates](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/blueprints/one-oe/runtime/one-stack/readme.md). Its shared compartments, identity domain, hub network and governance tags must be ready before deploying FinOps.

2. **Deploy the FinOps add-on — extend the Landing Zone.** Follow the [FinOps infrastructure deployment steps](deployment/FinOps_LandingZone_addon/README.md) to provision the FinOps compartment, IAM, private networking, ADB, Vault/key and notifications, integrating with the existing One-OE services. Provision central Bastion access when needed, or reuse an existing managed central Bastion.

3. **Configure the database modules.** Follow the [database configuration and installation guide](installation-guide/README.md) to prepare credentials and Secrets, then install the FinOps schemas and modules using Python.

4. **Create OAC and configure reporting.**

   <ol type="A">
     <li><a href="installation-guide/oac/oac-service-setup.md">Create the OAC instance manually and prepare ADB connectivity</a>, or reuse an existing service.</li>
     <li><a href="installation-guide/oac/oac-workbook-import.md">Import the workbook and configure its database connection</a>.</li>
     <li><a href="installation-guide/oac/oac-user-onboarding.md">Configure consumer access</a>.</li>
     <li><strong>Optional:</strong> <a href="installation-guide/oac/oac-ai-assistant-consumers.md">Index datasets and enable AI Assistant</a>.</li>
   </ol>

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
