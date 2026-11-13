# Module 02 — OCI provider

## Purpose

The OCI provider has three mandatory components for the complete solution: FOCUS ingestion (00), the FinOps tag catalog and reporting profile (01a), and tenancy/account context and contracts (02). These form the functional baseline. Optional extensions add datasets independently. All components run in `FOCUSPLATFORM` after the shared schema and common core; each also needs its own OCI API permissions. Start with the [platform installation guide](../installation-guide/README.md) for these prerequisites and the installation sequence.

## Functional architecture and data dependencies

The groups show membership and required versus optional status. Arrows show data consumption in the architecture, not the installation sequence. Shared schema/core prerequisites apply to every component and are omitted from the arrows for clarity. The separate OAC database module is shown to make its consumption of FOCUS and the tag profile explicit.

See the [platform architecture diagram](README.md#architecture) for the shared foundation, OCI modules and separate OAC service.

Mandatory means required for the complete solution, not that the three baseline components consume one another's data. OCI 01a and OCI 02 can collect their metadata without OCI 00. Budgets, Advisor, Anomalies and Forecast also read OCI APIs directly without FOCUS.

Functional dependencies determine which data a component consumes. Structural availability alone does not establish source synchronization, completed ingestion, tag backfill or reporting freshness; each component records its runtime outcomes.

## Component prerequisites

All rows assume the shared schema, common core and authorized resource principal.

| Component | Required OCI data/components | Readiness condition |
| --- | --- | --- |
| 00 — Ingestion | None | FOCUS report access; landing and pipelines created. Check asynchronous load separately. |
| 01a — FinOps tag profile | None | Required governance tag definitions exist in OCI; catalog synchronized and a reporting profile selected. No FOCUS row extraction. |
| 02 — Account context and contracts | None | Identity and commercial API access; context and contract syncs checked independently. |
| 01b — All defined-tag values | 00 and 01a | Landing and valid tag catalog/profile API; historical extraction is optional and can consume substantial storage and compute. |
| 03–06 — Budgets, Advisor, Anomalies, Forecast | None | Each component's API access and independent source-sync result. |
| OAC cost detail | 00 and 01a | Active profile, reporting privileges and a completed initial build before use. |

The two tag components have different contracts. **01a is required:** it catalogs OCI tag definitions and selects a reporting profile. The governed default uses `tagns-lz-cost-governance` and its six governance tags; custom profiles can select another existing namespace or explicit tag list. It neither creates OCI namespaces nor extracts FOCUS row values. **01b is optional:** it stores all nonblank cataloged defined-tag values by FOCUS row, independently of the reporting profile. Skipping 01b does not prevent profile tags appearing in OAC cost detail.

## Choose the OCI parts

This page defines component boundaries and data dependencies. Each linked component design inventories the tables, columns, indexes, routines, views, pipelines, and jobs owned by that component.

| Part | Decision | What it provides | Design |
| --- | --- | --- | --- |
| FOCUS ingestion and remediation | Required | One OCI landing across years, year pipelines, failed-file detection, row remediation, and core registration. | [Model and workflow](02-oci-ingestion.md) |
| Tag definitions and FinOps reporting profile (01a) | Required for reporting | Reads OCI namespace/tag definitions and selects a versioned profile; requires the existing `tagns-lz-cost-governance` namespace and six governance tags. Does not extract row values. | [Catalog and profiles](02-oci-tags.md) |
| All defined-tag values by FOCUS row (01b) | Optional; skip for a smaller repository | Long-form values for all nonblank cataloged defined tags on FOCUS rows, including tags outside the active profile. If skipped, raw `TAGS` JSON and active-profile columns remain available. | [Value extraction](02-oci-tag-values.md) |
| Account context and contracts (02) | Required for the complete baseline | Tenancy, compartments, regions, subscriptions, services, and commitments, with separate daily and monthly syncs. Independent of OCI 01b. | [Account and contract model](02-oci-account-contracts.md) |
| OCI Budgets (03) | Optional | OCI budget definitions, source spend metrics and alert rules. FOCUS comparison is withheld until target, cycle and currency can be aligned. | [Budget model](02-oci-budgets.md) |
| Cloud Advisor (04) | Optional | OCI recommendations and resource actions. Skipping it leaves out Advisor datasets. | [Cloud Advisor](02-oci-cloud-advisor.md) |
| Cost Anomalies (05) | Optional | OCI anomaly monitors and events. Skipping it leaves out native anomaly datasets. | [Cost Anomalies](02-oci-cost-anomalies.md) |
| Native Forecast (06) | Optional | OCI Usage API actuals and BASIC forecast. Skipping it leaves out native forecast datasets. | [Native Forecast](02-oci-forecast.md) |

Deployment commands and verification markers are defined once in the [installation guide](../installation-guide/database-modules/python-installation.md#module-verification-and-background-results).

## Visualization boundary

[Module 03 / OAC](03-oac-oci-focus-cost-detail.md) creates the database cost-detail interface from the OCI landing and active tag profile. OAC connections, datasets, workbooks, and dashboards are configured in the OAC service. The visualization layer combines this reporting interface with datasets from every installed OCI module: Account Context, Budgets, Cloud Advisor, Anomalies, Forecast and historical tag values. Those module datasets are separate from the cost-detail MV. Their connections, datasets and workbook content are configured in OAC; the database installers create the underlying database objects.
