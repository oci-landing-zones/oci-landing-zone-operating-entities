# FinOps FOCUS Platform

FinOps FOCUS Platform is a modular, multicloud architecture for financial visibility, cost governance, and optimization. It brings each cloud provider's cost and usage data into a shared reporting environment built on the FinOps FOCUS standard. This repository contains **V2** of the platform. **OCI is the only cloud provider implemented today**; the architecture allows other providers to be added without redesigning the existing modules.

The database solution has three levels:

1. **Ingestion:** a provider module reads its FOCUS files, loads its landing data, and reconciles rejected files and rows.
2. **Data preparation:** provider modules add the context needed for analysis and shape data for reporting. For OCI, this includes defined tags, account information, subscriptions, and commitments; optional modules add budgets, recommendations, anomalies, and forecasts.
3. **Visualization:** a database module for each presentation tool publishes stable reporting interfaces. The tool uses those interfaces to build datasets and dashboards. OAC is the default presentation tool for V2.

A **shared core** registers installed providers, coordinates their scheduled work, records execution status, and sends operational notifications. It does not contain provider-specific file layouts or transformation rules. Provider modules and visualization modules can be installed and evolved independently after their shared prerequisites. The database modules run inside an Oracle Autonomous Database (ADB) provisioned in the customer's Landing Zone; the OAC service renders dashboards outside the database.

## Architecture

The platform combines a shared database foundation, provider-specific modules and separate visualization modules. See the [architecture and module designs](design/README.md) for the diagram, component boundaries, data models and processing flows.

## Installation

Follow the [installation guide](installation-guide/README.md) to install the add-on schemas in an existing ADB using Python with Landing Zone conventions or direct SQL, then create or configure OAC and import the workbook. Post-installation procedures are covered in [ADB maintenance and diagnostics](installation-guide/adb/maintenance-and-diagnostics.md).
