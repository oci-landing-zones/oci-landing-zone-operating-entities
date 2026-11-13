# Design documentation

This guide describes the platform architecture and links to each module's data model, database objects and processing flows. For prerequisites, commands and verification steps, use the [installation guide](../deployment/install/README.md).

## Architecture

FinOps FOCUS Platform is designed to run in an OCI **parent tenancy**. Its database modules run in an existing Oracle Autonomous Database (ADB) in that tenancy. A shared foundation supports the provider and visualization modules: Module 00 creates the platform schema and access grants; Module 01 installs the provider-neutral Common Core, which registers providers, coordinates scheduled work, records execution results and sends optional operational notifications.

Provider modules own their source formats, landing data, remediation and analytical context. OCI is the only implemented provider. Its [design overview](02-oci-provider.md) defines the mandatory baseline, optional components and actual data dependencies. The architecture allows other cloud providers to be added through separate modules.

Visualization modules publish database reporting interfaces independently of the presentation tool. The OAC database module prepares the OCI cost-detail interface; the separate OAC service uses it for datasets and dashboards. OAC is the default presentation tool, and its importable workbook is described in the [workbook guide](../deployment/oac-configuration/oac-workbook-import.md). Additional visualization modules can be added without changing ingestion.

![Platform architecture with shared foundation, OCI modules and separate OAC service](diagrams/02-oci-provider.svg?rev=66e7d1e)

[Open the full-size architecture diagram](diagrams/02-oci-provider.svg?rev=66e7d1e).

Arrows represent data consumption in the architecture. OAC reads costs and selected tags through the database reporting interface and combines them with datasets from the installed OCI modules: Account Context, Budgets, Cloud Advisor, Anomalies, Forecast and historical tag values. Shared foundation prerequisites apply to all database modules; the [installation guide](../deployment/install/README.md) defines installation order. Each concrete module design lists its database objects, table columns and Oracle types; Module 00 creates schemas and grants without application tables.

## Foundation

| Module | Design |
| --- | --- |
| 00 — Schema and access | [Schema bootstrap](00-schema-bootstrap.md): owner, grants, resource principal, and privilege boundaries. |
| 01 — Shared core | [Provider-neutral coordinator](01-common-core.md): provider registry, serialized daily execution, audit, and Notifications report. |

## OCI provider

Start with the [OCI provider overview](02-oci-provider.md) for the architecture and actual data dependencies. The mandatory functional baseline is OCI 00 ingestion, OCI 01a FinOps tag catalog/profile, and OCI 02 tenancy/account context and contracts. All remaining components are optional extensions. Required membership in the complete solution is separate from technical prerequisites and installation order.

| Component | Design |
| --- | --- |
| 00 — Ingestion | [FOCUS ingestion and remediation](02-oci-ingestion.md): landing, pipelines, failed-file recovery, and shared stage. |
| 01a — Tag definitions | [Catalog and reporting profiles](02-oci-tags.md): OCI metadata, active profile, stable tag slots, and profile changes. |
| 01b — Tag values, optional | [Defined-tag values](02-oci-tag-values.md): bounded extraction of all cataloged defined-tag values by FOCUS row. |
| 02 — Account and contracts | [Account context and commitments](02-oci-account-contracts.md): tenancy hierarchy and commercial-contract snapshots. |
| 03 — Budgets (optional) | [OCI Budgets and FOCUS comparison](02-oci-budgets.md): budget/alert snapshots, read-only sync, and explicit comparison limits. |
| 04 — Cloud Advisor (optional) | [Cloud Advisor](02-oci-cloud-advisor.md): recommendations and resource-action snapshots. |
| 05 — Cost Anomalies (optional) | [Cost Anomalies](02-oci-cost-anomalies.md): native anomaly monitors and events. |
| 06 — Native Forecast (optional) | [Native Forecast](02-oci-forecast.md): Usage API actuals and forecast vintages. |

## Visualization

| Module | Design |
| --- | --- |
| 03 / OAC | [OCI FOCUS cost detail](03-oac-oci-focus-cost-detail.md): versioned materialized view, stable `TAG_n` columns, label lookup, and synonym cutover. |

## Jobs and schedules

See the [cross-module job reference](jobs-and-schedules.md) for recurring and one-time jobs, initial enabled/disabled states, local launch times and frequency.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
