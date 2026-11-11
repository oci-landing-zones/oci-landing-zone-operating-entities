# ADB maintenance and diagnostics

Use this guide after schema installation for health checks, ADB restart, optional capacity adjustments and database maintenance. Installation steps and shared session inputs are defined once in the [manual SQL guide](manual-sql-installation.md); [Python status commands](python-installation.md#verify-installation-and-read-only-status) remain in the Python guide.

Diagnostic reports are read-only. Rescheduling, capacity changes, MV rebuilds and retention change database state; run only the procedure required for the task. The retention sections distinguish preview, scheduling and destructive execution.

## Contents

- [Installation inventory and dependencies](#installation-inventory-and-dependencies)
- [Operating state](#operating-state)
- [Filtered module status](#filtered-module-status)
- [Enable, change or disable core notifications](#enable-change-or-disable-core-notifications)
- [Coordinator and notification diagnostics](#coordinator-and-notification-diagnostics)
- [ADB stop and restart windows](#adb-stop-and-restart-windows)
- [Optional defined-tag catch-up capacity](#optional-defined-tag-catch-up-capacity)
- [Rebuild and publish the OAC cost-detail MV](#rebuild-and-publish-the-oac-cost-detail-mv)
- [OAC build capacity and failures](#oac-build-capacity-and-failures)
- [Upgrade an existing tag-name MV to stable slots](#upgrade-an-existing-tag-name-mv-to-stable-slots)
- [Configure and run rolling retention](#configure-and-run-rolling-retention)
- [Purge expired OCI FOCUS landing rows](#purge-expired-oci-focus-landing-rows)

The diagnostic commands in the next three sections do not change the installation. They create no database objects, call no OCI APIs, start no jobs, and never compile or refresh materialized views. Run them as `FOCUSPLATFORM`. An administrator can instead set `CURRENT_SCHEMA=FOCUSPLATFORM` in their own session; the diagnostics use accessible dictionary views scoped to that schema. Dictionary access must cover the whole target schema for a complete inventory.

From the repository's `deployment/sql/install` directory:

```sql
@../monitoring/06_module_installation_health.sql
@../monitoring/07_jobs_and_objects_health.sql
@../monitoring/08_oac_materialized_view_health.sql
```

## Installation inventory and dependencies

`06_module_installation_health.sql` uses an explicit manifest of permanent tables, views, routines, packages and recurring jobs for each component. It distinguishes `NOT_INSTALLED`, `PARTIAL`, `INVALID`, `NEEDS_CONFIGURATION`, `CHECK_ERROR`, and `INSTALLED`. Partial and invalid rows list the missing or invalid objects. Configuration checks inspect small metadata/configuration tables, not FOCUS landing rows.

`INSTALLED` means that the listed structural contract and minimum configuration are present. It is not a replacement for each module's detailed installer verifier: it does not validate every column, constraint, privilege, schedule setting, collector definition or source permission. Use the [module installation and verification sequence](manual-sql-installation.md#run-modules-in-order) for those checks.

Ingestion also requires a registered OCI provider and at least one yearly FOCUS pipeline. Owners use `USER_CLOUD_PIPELINES`; cross-schema administrators need `DBA_CLOUD_PIPELINES`. Missing dictionary access is reported as a check error, not a successful installation. Runtime state and target/source configuration still need the ingestion verifier. OAC structure is inventoried separately from the validity/freshness of its dynamically named published MV, which is reported by check 08.

The shared foundation and OCI 00 ingestion, OCI 01a FinOps tag profile, and OCI 02 account context form the mandatory OCI baseline. A missing optional component is informational and does not prevent `OCI MANDATORY BASELINE STRUCTURE PASS`. Missing baseline components prevent that marker. OAC installation is reported separately and is not part of the OCI baseline decision.

For each present component, the report checks its actual dependencies against the same inventory. A component may have its own objects installed while a dependency needs attention; those are reported separately. The checks preserve independent installation of source collectors rather than requiring the whole baseline for every extension.

The OCI 02 installer automatically runs this report **after** its own installation and source-result checks. It reports whole-solution completeness without making ingestion or tags prerequisites for Account Context. Findings are nonfatal and do not roll back or reject an otherwise successful Account Context installation. The same report can be rerun manually at any time. It installs no persistent health package or module registry.

## Operating state

`07_jobs_and_objects_health.sql` reports invalid objects, enabled/disabled jobs, schedules, running jobs, latest Scheduler outcomes, and compilation errors. A disabled job can be intentional. A successful Scheduler execution does not establish source coverage or freshness; use each component's source-result report for those questions.

`08_oac_materialized_view_health.sql` identifies the materialized view currently published through the OAC synonym and reports all cost-detail versions independently. It separates object validity, compilation state, data staleness, refresh dates, source DML counters and partition DDL dates. Missing OAC objects produce empty result sets rather than static references to absent application tables.

For time correlation, spool repeated snapshots outside Git before and after an explicitly authorized refresh. `LAST_DDL_TIME` is not a DML timestamp; source modification counters are asynchronous estimates rather than a transaction audit. All snapshot headings specify UTC; dictionary DATE columns have no time-zone information and need the database's time convention when comparing them with zoned Scheduler timestamps. Historical versions need not represent the published interface.

Oracle documents that source DML can produce `NEEDS_COMPILE`, even without structural DDL. The state alone does not establish data corruption. After compilation validity is established, `STALE` means the MV reflects an earlier source state; `UNUSABLE` is a different consistency condition. Compiling revalidates metadata; it does not incorporate new source rows. These diagnostics deliberately perform neither operation. See [Oracle's MV state reference](https://docs.oracle.com/en/database/oracle/oracle-database/26/refrn/ALL_MVIEWS.html) and [Oracle's source-DML explanation](https://asktom.oracle.com/ords/asktom.search?tag=materialized-view-staleness-changes-to-needs-compile-after-dml).

The existing `00_platform_checkpoint.sql` remains an ADMIN-oriented snapshot for an already populated installation. The optional checks above are suitable for installation inventory and incomplete deployments as well.
## Filtered module status

For Python status options and interpretation, use [installation status guide](python-installation.md#verify-installation-and-read-only-status).

SQL wrappers `06_module_installation_health.sql` and `09_selected_module_status.sql` share `internal/module_status_report.sql`. The filtered wrapper requires initialized session parameters with `status_module_ids` and optional `status_detail` (`SHORT` or `LONG`, default LONG). The all-module wrapper initializes its own diagnostic bind. Neither performs repairs or starts jobs; source coverage remains a separate check.

## Enable, change or disable core notifications

Connect as `FOCUSPLATFORM` with SQL*Plus working directory `deployment/sql/install`. Enabling requires an existing Notifications topic, a confirmed subscription and ADB publish permission; see the [notification access requirements](../../design/01-common-core.md#finops_core_notify_config--combined-report-destination).

To enable delivery or replace the topic, initialize the session inputs and set `notifications_topic_ocid` in the existing `fp_install_config` CLOB as described in the [module input reference](manual-sql-installation.md#module-input-reference). Then run:

```sql
@01_core/02_enable_finops_core_notifications.sql
```

To disable delivery and clear the stored topic, run the separate operation below. It does not require a topic parameter; setting the parameter to null is not a substitute for this operation on an existing core.

```sql
@01_core/03_disable_finops_core_notifications.sql
```

Both operations preserve the common coordinator job and finish with its verifier. They change configuration without publishing a test email. Use the diagnostics below and the next scheduled report to check delivery.

## Coordinator and notification diagnostics

Connect as `FOCUSPLATFORM`. These queries inspect the coordinator without starting reconciliation or sending email:

```sql
SET LONG 100000
SELECT FINOPS_CORE_REPORT(NULL) AS REPORT FROM DUAL;

SELECT RUN_ID, STATUS, STARTED_AT, FINISHED_AT,
       PROVIDERS_FOUND, PIPELINES_FOUND, EMAIL_STATUS, EMAIL_ERROR
FROM FINOPS_CORE_RUN
ORDER BY RUN_ID DESC
FETCH FIRST 5 ROWS ONLY;

SELECT JOB_NAME, ENABLED, REPEAT_INTERVAL
FROM USER_SCHEDULER_JOBS
WHERE JOB_NAME = 'FINOPS_CORE_DAILY';
```

`FINOPS_CORE_REPORT(NULL)` uses the latest audit and asks enabled providers for their status. `EMAIL_STATUS='SENT'` records successful publication; confirm receipt in the subscribed mailbox.

## ADB stop and restart windows

Scheduler runs inside ADB and cannot start a stopped database. Arrange the external start mechanism before the required module jobs and allow for database readiness. Module designs record job defaults; the core-selected IANA time zone controls local scheduling. Account for daylight-saving changes if the external start mechanism uses UTC.

After restart, inspect module audits and Scheduler history rather than assuming missed occurrences ran. The [job inventory](../../deployment/sql/monitoring/04_focusplatform_job_inventory.sql) shows time zones, next runs, enabled state and active jobs. The optional [rescheduler](../../deployment/sql/monitoring/03_reschedule_focusplatform_after_adb_start.sql) uses the configured time zone and preserves the OAC cadence. Durable module ledgers protect committed work, but source coverage and MV freshness still need separate verification.

## Optional defined-tag catch-up capacity

The [tag-value design](../../design/02-oci-tag-values.md#how-it-works) defines bounded batches, row limits and historical-cursor behavior. The optional [catch-up adjustment](../../deployment/sql/monitoring/05_accelerate_oci_tag_value_catchup.sql) sets 40,000 rows and a five-minute cadence for an installed, enabled, idle worker. Measure duration, capacity, errors and ingestion impact first; overlapping triggers may be skipped. Record the original settings and reassess them after catch-up using the configuration, run audit and Scheduler history.

## Rebuild and publish the OAC cost-detail MV

For ordinary profile changes, follow [change a profile and publish an MV candidate](manual-sql-installation.md#change-a-profile-and-publish-an-mv-candidate). To choose another local landing table or changed scalar structure, run [`rebuild_oci_focus_cost_detail_from_landing.sql`](../../deployment/sql/install/03_visualization/OAC/maintenance/rebuild_oci_focus_cost_detail_from_landing.sql) from `deployment/sql/install`, with initialized session binds and optional `source_table` in `fp_install_config` (default `OCI_FOCUS_REPORTS`). It does not prompt for a table name.

The helper builds and validates a separate candidate and records it as `READY` without moving the published synonym. Inspect the build audit and candidate, then use the [explicit publication operation](manual-sql-installation.md#change-a-profile-and-publish-an-mv-candidate) with that run ID. Check the source columns, FAST-refresh eligibility and OAC dataset compatibility against the [source-table requirements](../../design/03-oac-oci-focus-cost-detail.md#scope-and-dependencies). A successful Scheduler invocation alone does not prove a valid candidate, publication or fresh reporting data.

## OAC build capacity and failures

Size landing, MV, MV log, indexes and temporary workspace for retained volume. Initial setup builds an empty MV before ingestion; later candidates scan populated data. Record build duration, capacity and concurrent jobs.

A later candidate build and tag-value extraction use independent locks. If overlap causes pressure, record the worker's limit/cadence, prevent new starts, let any active invocation finish and restore the saved settings after validation. This is a capacity adjustment, not an extra first-installation step or a guarantee against snapshot errors.

For `ORA-01555`, retain the build audit and correlate its interval with `V$UNDOSTAT.TUNED_UNDORETENTION`, `MAXQUERYLEN` and `SSOLDERRCNT`. Inspect concurrent writes and available capacity before retrying. A configured undo-retention value or successful Scheduler invocation does not prove a completed build. Keep the existing synonym on its validated MV while a replacement is incomplete.

## Upgrade an existing tag-name MV to stable slots

From `deployment/sql/install`, run `@03_visualization/OAC/maintenance/upgrade_oci_focus_cost_detail_to_tag_slots.sql` as `FOCUSPLATFORM` once. It updates the run-state constraint for safe `READY` cutover, installs the published-slot label view and new builder, and requests a full replacement MV in the background. It does not drop or refresh the current published MV. Wait for a `COMPLETE` build whose MV matches the synonym, then run the OAC verifier and inspect `OAC_OCI_FOCUS_TAG_SLOT_V`. This first upgrade changes old tag-name columns to `TAG_n`; OAC workbooks using those old names need a one-time rebind. Later profile additions retain existing `TAG_n` bindings. Build duration depends on landing volume, storage, and available database resources; measure it in the target deployment.

Check the build and Scheduler result with the existing OAC verifier and this query:

```sql
SELECT r.run_id, r.status, r.source_table, r.mv_name, r.mv_rows,
       r.error_code, r.error_message, r.started_at, r.finished_at
FROM oac_oci_focus_cost_detail_run r
WHERE r.run_kind='BUILD'
ORDER BY r.run_id DESC
FETCH FIRST 5 ROWS ONLY;

SELECT s.table_name AS published_mv, m.staleness, m.compile_state,
       m.refresh_method
FROM user_synonyms s JOIN user_mviews m ON m.mview_name=s.table_name
WHERE s.synonym_name='OAC_OCI_FOCUS_COST_DETAIL';
```

The `COMPLETE` build must match the synonym target. A finished Scheduler job alone is insufficient. A different landing structure can change OAC column names and types; review and adjust OAC datasets and workbooks before using the new contract. FAST eligibility is an Oracle capability test, so a table with unsupported columns or transformations is rejected without publishing it. The original `OAC_OCI_FOCUS_COST_DETAIL_API.BUILD_ACTIVE` still builds from `OCI_FOCUS_REPORTS`; use this rebuild helper when the source table or its structure must be chosen explicitly.

## Configure and run rolling retention

Fresh ingestion installs the rolling-retention component but leaves its monthly job disabled and runs no cleanup. Review the [retention design](../../design/02-oci-ingestion.md#optional-rolling-retention-execution) for cutoff protection, pipeline blockers, transaction boundaries and MV behavior before opting in.

For an existing ingestion deployment without any retention objects, a qualified operator can install the create-only component as `FOCUSPLATFORM`, from `deployment/sql/install`:

```sql
@02_providers/OCI/00_ingestion/internal/09_install_retention.sql
```

Prerequisites are the OCI landing and pipeline metadata, common core schedule API, and direct `DBMS_LOCK` access supplied by schema installation. The OAC synonym, MV and capability-analysis table are required before an actual nonempty cleanup; their checks are deferred until execution because ingestion is installed before the OAC database module. Do not rerun the full ingestion installer on a populated schema. This component refuses existing retention objects and does not upgrade/reset a partial or populated retention installation. For new deployments, the provider's combined report includes the latest retention outcome; existing deployments can inspect the audit queries below without recompiling the provider report.

### Choose or change the policy

Connect as `FOCUSPLATFORM`. Set the persistent policy, for example:

```sql
EXEC OCI_FOCUS_RETENTION_API.SET_POLICY(24);
SELECT KEEP_MONTHS FROM OCI_FOCUS_RETENTION_CONFIG WHERE CONFIG_ID=1;
```

Only whole numbers **at least 12** are accepted. The policy change does not delete rows, enable the job, or start a run. The next preview or scheduled invocation reads the new policy. A run already in progress uses the policy captured when it started.

The [retention design](../../design/02-oci-ingestion.md#optional-rolling-retention-execution) defines UTC cutoffs and protected periods; review the preview before enabling cleanup.

### Preview, then opt in

Preview is the default and never deletes landing rows. It records metadata counts in the audit tables; it is not a read-only session in the sense of making no audit writes.

```sql
EXEC OCI_FOCUS_RETENTION_API.RUN;
```

This shows totals and monthly counts, never source rows. It checks affected-year pipelines too, and reports `BLOCKED` if one is active. A preview does not establish MV DELETE-refresh capability; that is verified again before an actual nonempty delete.

Enable the monthly job only after reviewing the policy and testing on disposable data:

```sql
EXEC DBMS_SCHEDULER.ENABLE('OCI_FOCUS_RETENTION_MONTHLY');

SELECT JOB_NAME,ENABLED,REPEAT_INTERVAL,NEXT_RUN_DATE
FROM USER_SCHEDULER_JOBS
WHERE JOB_NAME='OCI_FOCUS_RETENTION_MONTHLY';
```

The ingestion startup verifier expects the installation default (retention job disabled, year pipelines stopped). After opting into retention, use the configuration/job queries and run audits in this guide rather than treating that startup verifier as an operational health check.

Default schedule: **day 1 of each month at 03:30 in the installation-selected time zone**, using the core schedule API. Inspect `NEXT_RUN_DATE` after enabling. The time zone controls execution time; UTC charge dates control retention. Enabling does not change the policy. To change only the monthly time, for example to 05:15:

```sql
BEGIN
  DBMS_SCHEDULER.SET_ATTRIBUTE(
    'OCI_FOCUS_RETENTION_MONTHLY','repeat_interval',
    'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=05;BYMINUTE=15;BYSECOND=00');
END;
/
```

To stop future triggers:

```sql
EXEC DBMS_SCHEDULER.DISABLE('OCI_FOCUS_RETENTION_MONTHLY');
```

Disabling a schedule is not an undo operation and does not forcibly interrupt a running cleanup. Inspect running jobs separately.

### Execute manually without enabling a schedule

The same procedure can perform the rolling cleanup on demand. This command is **destructive** and does not ask an interactive confirmation:

```sql
EXEC OCI_FOCUS_RETENTION_API.RUN(P_PREVIEW_ONLY=>0);
```

It uses the configured policy. A per-call override is also supported without changing the stored policy, and still requires at least 12 months:

```sql
-- Preview a 36-month policy for this call only.
EXEC OCI_FOCUS_RETENTION_API.RUN(P_KEEP_MONTHS=>36,P_PREVIEW_ONLY=>1);
```

The existing [manual range helper](#purge-expired-oci-focus-landing-rows) remains separate: it accepts inclusive first/last months and requires confirmation. It retains its stricter stop-all-year-pipelines prerequisite. It does not inherit the rolling API's minimum-retention protection. Never run that helper concurrently with rolling retention.

### Blockers, recovery and refresh checks

Keep affected historical pipelines and all manual/recovery writers idle; retention never stops them automatically. `BLOCKED` requires inspecting the named pipeline or competing invocation and arranging its state before retrying. `FAILED` can include committed months: inspect the month audit before another run. Disabling the job prevents future triggers and does not undo committed deletes or forcibly stop an active run. Never overlap rolling retention with the separate range helper.

The API does not refresh the MV. After deletion, inspect the normal refresh audit and reporting data separately. Validate pipeline blocking, monthly partial recovery and DELETE propagation with disposable data before production use. Scheduler status alone does not prove current reporting data.

### Inspect results

```sql
SELECT RUN_ID,STARTED_AT,FINISHED_AT,KEEP_MONTHS,CUTOFF_UTC,
       PREVIEW_ONLY,STATUS,ROWS_ELIGIBLE,ROWS_DELETED,MESSAGE
FROM OCI_FOCUS_RETENTION_RUN
ORDER BY RUN_ID DESC FETCH FIRST 10 ROWS ONLY;

SELECT MONTH_START_UTC,ROWS_ELIGIBLE,ROWS_DELETED,COMMITTED_AT
FROM OCI_FOCUS_RETENTION_MONTH
WHERE RUN_ID = &run_id
ORDER BY MONTH_START_UTC;

SELECT JOB_NAME,STATUS,ACTUAL_START_DATE,ERROR#,ADDITIONAL_INFO
FROM USER_SCHEDULER_JOB_RUN_DETAILS
WHERE JOB_NAME='OCI_FOCUS_RETENTION_MONTHLY'
ORDER BY LOG_DATE DESC FETCH FIRST 10 ROWS ONLY;
```

`PREVIEW` means counts only; `NO_DATA` means a destructive invocation had no eligible rows; `COMPLETED` means the landing deletes committed, not that the MV refreshed. `BLOCKED` and `FAILED` require reading the message and monthly progress. Eligible counts are observations at the start and can differ from deletion counts if other writers intervene. Audit history is retained; this component does not purge its own logs automatically.

## Purge expired OCI FOCUS landing rows

For an opt-in rolling policy, use the [rolling retention procedure](#configure-and-run-rolling-retention). The independent range helper below is an operator action with stricter pipeline prerequisites; it is not an initial installation step.

To delete a retention interval of complete months, first stop all OCI FOCUS year pipelines and wait until no pipeline Scheduler run remains active. Keep manual loads, recovery workers and other landing writers stopped throughout the preview and deletion; the checks are not a database-wide writer lock. Connect as `FOCUSPLATFORM` in a dedicated SQL*Plus session with no unrelated pending transaction, start from `deployment/sql/install`, and run:

```sql
@02_providers/OCI/00_ingestion/maintenance/purge_oci_focus_reports_before.sql
```

Enter **first month** and **last month** as `YYYY-MM`, both inclusive. Days are not accepted. For example, `2024-01` through `2024-03` means UTC `ChargePeriodStart >= 2024-01-01 00:00:00` and `< 2024-04-01 00:00:00`. Single-month and cross-year ranges are supported. Invalid dates and reversed ranges stop before any landing deletion. The historical filename is retained for compatibility; it no longer means "everything before a day-level cutoff".

The script verifies FAST capability after single-table DML for the published MV, previews the interval and total/per-month row counts, and only then asks for `PURGE`. Enter anything else to cancel. The prerequisite analysis uses `MV_CAPABILITIES_TABLE`; no landing rows are deleted before confirmation. A capability failure stops the operation. An interval containing no rows has no landing data to delete.

The cleanup uses `DELETE`, not `TRUNCATE`, partition removal or a backup table. It commits each month and prints its deleted-row count. Before a month's commit its changes can roll back; **already committed months cannot be undone by `ROLLBACK`**. On failure, the current uncommitted month rolls back, while earlier committed months remain deleted. Review the printed progress and actual landing data before deciding whether to rerun the same interval; already deleted rows will not be deleted twice. No row copies are created by this script.

Selection is based on the stored UTC **charge period**, not the source file's folder/date. A charge from the last day of March may be deleted even if it arrived in an April file. Reloading only the March folder may therefore be incomplete and can also include rows outside March. Reloading, temporary pipelines, file tracking and duplicate handling are separate operations and are not implemented or triggered by this cleanup. Do not reset an annual pipeline as part of the delete.

For a two-year policy, the operator chooses the last expired month and the earliest month to remove, reviews the preview, and executes the helper manually. There is no automatic rolling window, scheduling or future-ingestion filter: later loads may introduce old rows again. Decide separately whether the policy retains the current partial month plus complete historical months. Monthly commits limit transaction scope; they do not guarantee a small undo requirement for a very large month.

The MV and its log are maintained by Oracle. The published MV retains the old rows until the next successful FAST refresh; this script does not start a refresh. Check the landing and the refresh run audit before returning the reporting data to use and resuming pipelines. Fewer rows can reduce storage/data-processing needs, but `DELETE` does not automatically return all allocated segment space and query speed still depends on access paths and partition pruning. Validate this destructive operation and its subsequent MV refresh with disposable data before production retention cleanup; no destructive live test is claimed here.
