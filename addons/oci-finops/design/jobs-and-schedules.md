# Jobs and schedules

## Contents

- [Scope and time zone](#scope-and-time-zone)
- [Recurring jobs](#recurring-jobs)
- [One-time and on-demand jobs](#one-time-and-on-demand-jobs)
- [Oracle-managed ingestion jobs](#oracle-managed-ingestion-jobs)
- [Current database state](#current-database-state)

## Scope and time zone

This is the cross-module reference for Scheduler jobs defined by the solution, including disabled jobs and jobs created only for a particular operation. Optional-module jobs exist only when their module is present. States below describe the definitions and their lifecycle, rather than the current state of a deployed database.

Recurring application jobs use `FINOPS_CORE_SCHEDULE_API.LOCAL_START_DATE()` and the region stored in `FINOPS_CORE_SCHEDULE_CONFIG.TIME_ZONE`. Fixed times below are local to that configured time zone, including its daylight-saving rules; they are not fixed UTC times. A time-zone configuration change alone does not rewrite existing Scheduler start dates; see [ADB stop and restart windows](../installation-guide/database-modules/maintenance-and-diagnostics.md#adb-stop-and-restart-windows) for schedule maintenance.

## Recurring jobs

| Module | Job | Frequency | Local scheduled time | Initial state and lifecycle |
| --- | --- | --- | --- | --- |
| Shared Core | [`FINOPS_CORE_DAILY`](01-common-core.md#finops_core_daily) | Daily | 04:00:00 | Enabled. Processes enabled providers; OCI remediation uses this coordinator rather than a separate job. |
| OCI tag catalog | [`OCI_TAG_CATALOG_DAILY`](02-oci-tags.md#oci_tag_catalog_daily) | Daily | 00:00:00 | Enabled. Refreshes metadata, without changing the selected profile or published MV. |
| OCI tag values, optional | [`OCI_TAG_VALUE_HOURLY`](02-oci-tag-values.md#oci_tag_value_hourly) | Hourly | Minute 00, second 00 of each hour | Enabled. Runs a bounded extraction batch. |
| OCI account context | [`OCI_ACCOUNT_CONTEXT_DAILY`](02-oci-account-contracts.md#oci_account_context_daily) | Daily | 01:00:00 | Enabled. |
| OCI commercial contracts | [`OCI_ACCOUNT_CONTRACT_MONTHLY`](02-oci-account-contracts.md#oci_account_contract_monthly) | Monthly, day 1 | 04:45:00 | Enabled. Independent of the daily account-context job. |
| OCI Budgets, optional | [`OCI_BUDGET_DAILY`](02-oci-budgets.md#oci_budget_daily) | Daily | 08:15:00 | Enabled. |
| OCI Cloud Advisor, optional | [`OCI_ADVISOR_DAILY`](02-oci-cloud-advisor.md#oci_advisor_daily) | Daily | 05:15:00 | Enabled. |
| OCI Cost Anomalies, optional | [`OCI_ANOMALY_DAILY`](02-oci-cost-anomalies.md#oci_anomaly_daily) | Daily | 06:15:00 | Enabled. |
| OCI Native Forecast, optional | [`OCI_FORECAST_DAILY`](02-oci-forecast.md#oci_forecast_daily) | Daily | 07:15:00 | Enabled. |
| OCI ingestion retention, opt-in | [`OCI_FOCUS_RETENTION_MONTHLY`](02-oci-ingestion.md#oci_focus_retention_monthly) | Monthly, day 1 | 03:30:00 | **Disabled.** Runs only after explicit opt-in. |
| OAC cost-detail refresh | [`OAC_OCI_FOCUS_COST_DETAIL_REFRESH_2H`](03-oac-oci-focus-cost-detail.md#oac_oci_focus_cost_detail_refresh_2h) | Every 2 hours | Minute 30, second 00; hour sequence depends on the Scheduler start date | **Disabled.** Enabled after the initial-load gate completes its validation and FAST refresh. |
| OAC initial-load monitor | [`OAC_OCI_FOCUS_COST_DETAIL_INITIAL_LOAD_GATE`](03-oac-oci-focus-cost-detail.md#oac_oci_focus_cost_detail_initial_load_gate) | Every 5 minutes | Relative to its Scheduler start date; no fixed daily hour | **Disabled.** Enabled when the initial pipelines start, then disabled after successful catch-up. |

The two interval calendars are `FREQ=HOURLY;INTERVAL=2;BYMINUTE=30;BYSECOND=00` for OAC refresh and `FREQ=MINUTELY;INTERVAL=5` for its load monitor. Neither specifies a fixed list of daily hours.

Some modules also request an immediate asynchronous execution independently of their recurring calendar: tag values, account context, contracts and the optional collectors. Initial pipeline startup can similarly request the Core coordinator. These requests reuse the jobs above; they do not create additional recurring jobs or change the next calendar occurrence. Calendar times do not establish dependencies between modules.

## One-time and on-demand jobs

These jobs have no repeat interval or fixed daily launch time. The delays below are requested start times, not guaranteed execution deadlines.

| Module | Job or generated name | Trigger and requested start | Enabled state and persistence |
| --- | --- | --- | --- |
| OAC initial population | [`OAC_OCI_FOCUS_COST_DETAIL_INITIAL_BUILD`](03-oac-oci-focus-cost-detail.md#oac_oci_focus_cost_detail_initial_build) | Initial MV population, 10 seconds after creation. | Created enabled; `AUTO_DROP=FALSE` retains the job after the one-time execution. |
| OAC initial-load completion | [`OAC_OCI_FOCUS_COST_DETAIL_GATE_STOP`](03-oac-oci-focus-cost-detail.md#oac_oci_focus_cost_detail_gate_stop) | Successful gate completion, 1 minute after creation; disables the recurring initial-load monitor. | Created enabled; `AUTO_DROP=TRUE` removes the job after completion. |
| OAC selected-profile candidate | `OAC_OCI_FOCUS_COST_DETAIL_BUILD_<id>` | An explicit [profile-build request](../deployment/sql/install/03_visualization/OAC/01_build_oac_oci_focus_cost_detail_from_active_profile.sql), 10 seconds after creation. No job is needed when the selected mapping is already published. | Created enabled; `AUTO_DROP=TRUE`. Builds a candidate without changing the published synonym. |
| OAC source-table candidate | `OAC_OCI_COST_REBUILD_<id>` | An explicit [source-table rebuild request](../deployment/sql/install/03_visualization/OAC/maintenance/rebuild_oci_focus_cost_detail_from_landing.sql), 10 seconds after creation. | Created disabled while its argument is set, then enabled by the same request; `AUTO_DROP=FALSE`. Publication remains explicit. |

Both generated-name families use a unique 16-character identifier. A retained one-time job is not a recurring schedule, and an automatically removed job no longer appears in the current job inventory.

## Oracle-managed ingestion jobs

| Module | Job family | Frequency and launch time | Lifecycle |
| --- | --- | --- | --- |
| OCI ingestion | `PIPELINE$<id>`, managed by `DBMS_CLOUD_PIPELINE` for each `OCI_FOCUS_REPORTS_LOAD_YYYY` pipeline | Pipeline interval: **60 minutes**. There is no fixed daily wall-clock hour defined by the solution; Oracle controls the Scheduler job associated with each started pipeline. | Year pipelines are prepared **STOPPED**. Startup follows validation of the empty, populated initial OAC MV. Pipeline start/stop controls these Oracle-managed jobs. |

The [year-pipeline design](02-oci-ingestion.md#year-pipelines) defines source selection and pipeline behavior. These jobs load files; `FINOPS_CORE_DAILY` separately handles provider remediation. Module 00 creates no Scheduler jobs.

## Current database state

Schedules can subsequently be changed, jobs disabled, and one-time jobs completed or removed. The read-only [job inventory](../deployment/sql/monitoring/04_focusplatform_job_inventory.sql) reports the actual `ENABLED` flag, Scheduler state, repeat expression, start-date time zone, next run and currently running jobs in the owner schema. Its use belongs to [maintenance and diagnostics](../installation-guide/database-modules/maintenance-and-diagnostics.md#operating-state).
