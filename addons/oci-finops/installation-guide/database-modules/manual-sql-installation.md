# Install the FinOps add-on schemas with direct SQL

Use this route with your own compatible ADB, credentials and connection. It installs the same module SQL without the Python configurator's resource-name discovery.

The [common deployment prerequisites](../README.md#common-database-prerequisites) apply to this route.

## Contents

- [Manual prerequisites](#manual-prerequisites)
- [Wallet and connection](#wallet-and-connection)
- [Connect and initialize the ADMIN session](#connect-and-initialize-the-admin-session)
- [Set inputs for the schema session](#set-inputs-for-the-schema-session)
- [Module input reference](#module-input-reference)
- [Run modules in order](#run-modules-in-order)
- [Module checks and background results](#module-checks-and-background-results)
- [Change a profile and publish an MV candidate](#change-a-profile-and-publish-an-mv-candidate)
- [Compatibility limits](#compatibility-limits)
- [OAC connection](#oac-connection)
- [Failed or interrupted installation](#failed-or-interrupted-installation)

Use this route when Python's named-resource convention does not match. The ADB can have another name and reside in another compartment. Vault and the three named Secrets are not required by direct SQL: the operator supplies credentials securely.

## Manual prerequisites

| Requirement | What you supply |
| --- | --- |
| Database | Existing compatible Autonomous Database with required `DBMS_CLOUD` facilities and ADMIN access; these installers are not for arbitrary Oracle databases. |
| Connection | Your working wallet/TNS alias or supported connection configuration and network route. The connection alias can have another name. |
| Credentials | ADMIN login and secure values for the two bootstrap credential binds. Direct SQL does not retrieve Vault Secrets. |
| OCI authorization | ADB Resource Principal membership and source/API permissions for the chosen modules; see the [IAM reference](oci-resource-principal-iam.md). Different names do not waive access requirements. |
| Source/profile | Your FOCUS source and valid existing tag namespace or explicit list. `installation_mode=STANDALONE` allows a custom profile; governance tags apply only to the governed default profile. |
| Schema safety | New `FOCUSPLATFORM` and `OAC_FOCUS_READER` users for bootstrap; inspect existing/partial modules before create-only scripts. These application user names remain fixed in both routes. |
| Files/tools | Full checkout, including module `internal/` and `verify/` files; Git for obtaining/updating the complete checkout, and SQL*Plus with compatible client libraries on the installation host. SQL*Plus working directory is `addons/oci-finops/deployment/sql/install`, relative to the repository root. |

## Wallet and connection

Prepare your own working ADB wallet/TNS alias or supported connection configuration and the required network/DNS route. No specific local wallet directory, ZIP filename or connection alias is imposed by direct SQL. The Python configurator is not required. Use a SQL*Plus client with compatible Oracle client libraries; Instant Client packages must be from the same release.

## Connect and initialize the ADMIN session

With the complete repository already cloned locally, start from the root of your checkout:

```text
cd addons/oci-finops/deployment/sql/install
sqlplus /nolog
```

Connect as ADMIN using your working connection and secure password entry. Confirm `SHOW USER`. Keep this operating-system working directory: module `@` calls resolve from it.

Initialize inputs once in this connection:

```sql
@00_schema/00_set_install_parameters.sql
```

Supply `fp_focus_password` and `fp_reader_password` through your secured client-binding/stdin mechanism before bootstrap. Keep them in session memory, out of parameter files, shell arguments, spooled output and Git. The initializer clears them; do not call it again after supplying values. **Module scripts have no password or choice prompts.**

```sql
@00_schema/00_create_focusplatform_schema.sql
```

Bootstrap stops if either `FOCUSPLATFORM` or `OAC_FOCUS_READER` already exists. Before user creation, it enables `ADMIN`'s Resource Principal credential if missing and verifies that it is available. After creating both users, it clears the password binds, applies the database grants and enables Resource Principal access for `FOCUSPLATFORM` without delegation.

The final read-only verifier checks that both accounts are open, the owner roles/direct grants and storage quota are present, the reader has schema-wide read access without delegation, and the Resource Principal and required package execution paths are available. To repeat those checks independently, connect as `ADMIN` from the same working directory and run:

```sql
@00_schema/verify/00_verify_focusplatform_schema.sql
```

After `FOCUSPLATFORM SCHEMA VERIFICATION PASS`, reconnect as `FOCUSPLATFORM` through your own connection setup.

## Set inputs for the schema session

Initialize again after reconnecting, then populate non-secret JSON. Replace this example's customer bucket and custom namespace with existing resources:

```sql
@00_schema/00_set_install_parameters.sql
BEGIN
  :fp_install_config := TO_CLOB(q'~{
    "schema_version": 1,
    "installation_mode": "STANDALONE",
    "notifications_topic_ocid": null,
    "scheduler_time_zone": "UTC",
    "first_focus_year": 2025,
    "focus_source": {
      "mode": "CUSTOM_BUCKET",
      "region": "eu-frankfurt-1",
      "namespace": "customer_namespace",
      "bucket": "focus-reports",
      "prefix": ""
    },
    "tag_profile": {
      "schema_version": 1,
      "profile_name": "CUSTOM_COST_REPORTING",
      "mode": "NAMESPACE",
      "namespace": "Finance"
    }
  }~');
END;
/
```

For Oracle-managed reports, replace `focus_source` with `{"mode":"ORACLE_MANAGED"}`. Choose a supported available first year, or omit it to use source discovery. Customer prefixes are URL-encoded; empty means the bucket root. Selected tags must exist and be active. Keep SQL*Plus input lines short. The input reference below covers module requirements and explicit tag lists. A local `.sql` file may assign the CLOB; SQL*Plus does not automatically load JSON files into it. Split large assignments into short CLOB chunks. The initializer declares the JSON and credential binds and resets them; run it only once per new connection, before supplying values.

## Module input reference

Python and SQL*Plus invoke the same noninteractive module scripts; `PROMPT` reports progress and does not request answers. The separate manual retention helper remains interactive. JSON contains no passwords; ADMIN bootstrap receives secure credential binds, and the Python route retrieves their values from Vault.

| Module/operation | Input contract |
| --- | --- |
| Schema bootstrap (`00_schema/00_create_focusplatform_schema.sql`), as ADMIN | Populated `fp_focus_password` and `fp_reader_password`; both required, no double quotes or line breaks. Script creates `FOCUSPLATFORM` and `OAC_FOCUS_READER`, clears the binds and grants existing module privileges. |
| Common core (`01_core/01_install_finops_common_core.sql`), as FOCUSPLATFORM | `schema_version=1`, valid `scheduler_time_zone`; optional Notifications topic (`null`, empty or `NONE` disables email). |
| OCI ingestion (`02_providers/OCI/00_ingestion/00_install_oci_ingestion.sql`) | `focus_source.mode` is `ORACLE_MANAGED` or `CUSTOM_BUCKET`. Managed mode discovers the report source. Customer mode needs region, Object Storage namespace, bucket and optional **URL-encoded** prefix (empty means root). `first_focus_year` is optional; omitted means earliest discovered year. Supplied values must be an eligible whole year. |
| OCI tag catalog/profile (`02_providers/OCI/01_tags/00_catalog_profile/00_install_oci_tag_catalog_profile.sql`) | `tag_profile` object described below. No governance namespace is required for standalone custom input. The selected namespaces/tags must already exist and be active. |
| Account/contracts and optional provider modules | Their source context is discovered from ADB identity; no interactive module inputs. Existing module defaults and preflight/IAM requirements remain applicable. Full commercial source validation remains required in the target tenancy. |
| Initial OAC database module | Uses the selected stored profile and existing baseline; no interactive values. Its existing initial-build/pipeline sequence remains in place. |
| Apply/change a profile | `tag_profile`, passed to the same installed profile API. Does not build or publish an MV. |
| Refresh active profile | No extra input; reuses its stored specification. Does not build or publish an MV. |
| Build a candidate | Uses selected stored profile; auto-publication explicitly disabled. |
| Publish candidate | Positive `candidate_run_id` identifying one validated READY candidate. No implicit selection of the latest run. |
| Enable or change core notifications | `notifications_topic_ocid` in the CLOB; use the [notification procedure](maintenance-and-diagnostics.md#enable-change-or-disable-core-notifications). |
| Disable core notifications | No topic parameter; use the dedicated disable operation in the same procedure. |

`installation_mode=LANDING_ZONE` requires the initial governance namespace and reserved default profile. `STANDALONE` supports your own existing namespace or explicit tag list; it does not require the Python discovery names. Python's configurator still discovers a Landing Zone, rather than generic standalone resources.

### Tag specification

`schema_version`, `profile_name` and `mode` are required. Profile names are 1–128 uppercase letters/digits/underscores, beginning with a letter. Namespaces and tag names are case-sensitive existing names, not ordinals. Use exactly one of the following:

[NAMESPACE JSON example](../../deployment/config/tag-profile.namespace.example.json):

```json
{"schema_version":1,"profile_name":"CUSTOM_COST_REPORTING","mode":"NAMESPACE","namespace":"Finance"}
```

[TAG_LIST JSON example](../../deployment/config/tag-profile.list.example.json):

```json
{
  "schema_version":1,
  "profile_name":"CUSTOM_COST_REPORTING",
  "mode":"TAG_LIST",
  "tags":[
    {"namespace":"Finance","tag":"CostCenter"},
    {"namespace":"Operations","tag":"Environment"}
  ]
}
```

`NAMESPACE` selects all active definitions in exactly one existing namespace. `TAG_LIST` selects only the listed pairs, even if they belong to one namespace; duplicate pairs, inactive/missing definitions, an empty list, conflicting modes and unknown specification fields fail validation. Explicit lists never expand automatically on refresh. Governed installations still require the six standard governance tags when using the reserved default profile. That requirement is conditional on the requested governance profile, not a prerequisite for custom profiles.

See the [profile design](../../design/02-oci-tags.md#reporting-column-contract) for stable slots, retired tags and immutable revisions.

## Run modules in order

ADMIN bootstrap is the first row below. After reconnecting and setting the schema-session inputs, run the remaining selected rows as `FOCUSPLATFORM`. Keep OAC before pipeline startup. Preserve the populated binds; do not reinitialize between modules.

| Step and account | Requirement | SQL*Plus command | Expected structural result | Design reference |
| --- | --- | --- | --- | --- |
| 00 — Schema, as `ADMIN` | Required | `@00_schema/00_create_focusplatform_schema.sql` | `FOCUSPLATFORM SCHEMA VERIFICATION PASS` | [Schema and grants](../../design/00-schema-bootstrap.md) |
| 01 — Shared core, as `FOCUSPLATFORM` | Required | `@01_core/01_install_finops_common_core.sql` | `FINOPS CORE VERIFICATION PASS` | [Coordinator and Notifications](../../design/01-common-core.md) |
| OCI 00 — Ingestion and remediation | Required | `@02_providers/OCI/00_ingestion/00_install_oci_ingestion.sql` | `OCI INGESTION VERIFICATION PASS` | [Pipelines and remediation](../../design/02-oci-ingestion.md) |
| OCI 01a — Tag definitions and profile | Required OCI baseline | `@02_providers/OCI/01_tags/00_catalog_profile/00_install_oci_tag_catalog_profile.sql` | `OCI TAG CATALOG AND PROFILE VERIFICATION PASS` | [Tag catalog and profile](../../design/02-oci-tags.md) |
| OCI 02 — Account context and contracts | Required OCI baseline | `@02_providers/OCI/02_account_contracts/02_install_oci_account_contracts.sql` | `OCI ACCOUNT CONTEXT AND CONTRACT VERIFICATION PASS` | [Subscriptions and commitments](../../design/02-oci-account-contracts.md) |
| OCI 01b — All defined-tag values | Optional; requires OCI 00 and 01a | `@02_providers/OCI/01_tags/01_tag_values/01_install_oci_tag_values.sql` | `OCI TAG VALUE EXTRACTION VERIFICATION PASS` | [Tag-value extraction](../../design/02-oci-tag-values.md) |
| OCI 03 — Budgets | Optional | `@02_providers/OCI/03_budgets/03_install_oci_budgets.sql` | `OCI BUDGETS VERIFICATION PASS` | [Budgets design](../../design/02-oci-budgets.md) |
| OCI 04 — Cloud Advisor | Optional | `@02_providers/OCI/04_cloud_advisor/04_install_oci_cloud_advisor.sql` | `OCI CLOUD ADVISOR VERIFICATION PASS` | [Advisor design](../../design/02-oci-cloud-advisor.md) |
| OCI 05 — Cost Anomalies | Optional | `@02_providers/OCI/05_cost_anomalies/05_install_oci_cost_anomalies.sql` | `OCI COST ANOMALY VERIFICATION PASS` | [Anomaly design](../../design/02-oci-cost-anomalies.md) |
| OCI 06 — Native Forecast | Optional | `@02_providers/OCI/06_forecast/06_install_oci_forecast.sql` | `OCI NATIVE FORECAST VERIFICATION PASS` | [Forecast design](../../design/02-oci-forecast.md) |
| 03 / OAC — Database source | Required for V2 visualization | `@03_visualization/OAC/00_install_oac_oci_focus_cost_detail.sql` | `OAC COST DETAIL STRUCTURE PASS` | [Cost-detail MV and synonym](../../design/03-oac-oci-focus-cost-detail.md) |
| Start — OCI pipelines | Required after OAC's initial empty MV build | `@02_providers/OCI/00_ingestion/01_start_oci_focus_pipelines.sql` | Pipelines start only after MV `COMPLETE` and `VALID` checks | [Pipeline startup and initial-load gate](../../design/02-oci-ingestion.md) |

These are structural markers; inspect module verifiers/background results to establish completion. Before pipeline startup, wait for the initial empty OAC MV's COMPLETE build to be valid. The gated start script enforces that condition.

For a read-only inventory from `deployment/sql/install`:

```sql
@../monitoring/06_module_installation_health.sql
```

### Module checks and background results

Source preflight runs before module DDL. It establishes API access for that attempt; structural PASS markers do not prove that later background work completed.

| Component | Installation and acceptance checks |
| --- | --- |
| Shared core | The initial self-check calls `FINOPS_CORE_RUN_DAILY('N')` and records an audit without sending email. The verifier checks objects, configuration, selected time zone and enabled daily job. Confirm email delivery separately using [coordinator diagnostics](maintenance-and-diagnostics.md#coordinator-and-notification-diagnostics). |
| Ingestion | Pipelines are configured stopped. Pipeline startup waits one minute for an initial configuration/status snapshot and requests an asynchronous run of the existing common daily job. Later file/row outcomes require pipeline metadata and remediation ledgers. Retention stays disabled until enabled through the maintenance procedure. |
| Tag catalog/profile | Validate the core, clean module state, Resource Principal and requested specification before DDL. Initial catalog sync and profile selection precede the structural gate. Governed mode requires the reserved default; standalone input permits another existing namespace or explicit tag list. Module SQL has no ordinal-choice prompts. |
| Account context/contracts | Preflight checks Identity and commercial discovery. Successful Identity queries alone do not establish commercial source access. Required source checks must succeed before installation proceeds. Initial context and contract runs are asynchronous: inspect both audits and the source-result report, not only job submission. |
| Tag values | The structural gate checks metadata and code, then requests an immediate background run. It does not establish historical completion. Inspect `OCI_TAG_VALUE_RUN`, configuration/cursor progress and Scheduler history before accepting backfill. |
| Budgets, Advisor, Anomalies, Forecast | Each checks its API access, creates its objects and requests background synchronization. The structural verifier and source-result report answer different questions. |
| OAC cost detail | The initial verifier can report `OAC COST DETAIL SYNONYM READY; INITIAL POPULATION PENDING`. After population, rerun it and require `OAC COST DETAIL BUILD PASS`. Check a valid FAST-refreshable published MV, its staleness/compile state and totals by charge period/currency before creating OAC datasets. Scheduler success alone does not prove a complete first population. |

The module's `verify/` scripts provide its structural and source-result checks. [Shared diagnostics](maintenance-and-diagnostics.md#installation-inventory-and-dependencies) report whole-solution inventory without replacing module-specific checks.

## Change a profile and publish an MV candidate

Use a connected `FOCUSPLATFORM` session with the input binds initialized, as above. Preserve other inputs when setting `tag_profile` or `candidate_run_id` in the existing CLOB.

After configuring `tag_profile` in the input CLOB, run:

```sql
@02_providers/OCI/01_tags/00_catalog_profile/01_apply_oci_tag_profile.sql
@02_providers/OCI/01_tags/00_catalog_profile/02_refresh_oci_tag_profile.sql
```

Apply and refresh are separate choices, not commands that must always be run consecutively. The [profile design](../../design/02-oci-tags.md#routines-and-schedule) describes the shared API contract.

Build a candidate after an intended profile change:

```sql
@03_visualization/OAC/01_build_oac_oci_focus_cost_detail_from_active_profile.sql
```

Inspect `OAC_OCI_FOCUS_COST_DETAIL_RUN` and mapping/row counts, require the candidate to be `READY` and valid, and review workbook semantics. The current synonym stays unchanged even when the build finishes successfully. Initial installation retains its separately defined initial-publication lifecycle; this does not auto-publish later profile changes.

When ready, set `candidate_run_id` in the existing module-input CLOB to the chosen positive run ID and run:

```sql
@03_visualization/OAC/02_publish_oac_oci_focus_cost_detail_candidate.sql
```

It calls `PUBLISH_READY(P_RUN_ID)` and requires that exact READY candidate to match the active profile. Profile changes between build and publish reject the stale candidate. The optional custom-landing rebuild helper also now stops at READY and uses this separate publication action; it no longer changes the synonym itself. Merely refreshing the tag catalog does not request a candidate or update OAC datasets.

## Compatibility limits

Fresh installations create the profile `SPEC_JSON` and item `IS_ACTIVE` columns and allow mixed-profile header namespaces. Existing databases need a reviewed migration preserving profile revisions, published mappings and slot identities. Do not run create-only installers over populated modules or expect the old mixed-profile delegate to upgrade them. Review automation that depended on prompts or dense renumbering.

Before production use, validate Oracle compilation, grants, FAST refresh with retired typed-NULL columns, concurrent profile behavior and any existing-schema migration in a disposable Oracle environment.

## OAC connection

For reporting, continue with [OAC service preparation](../oac/oac-service-setup.md) and [workbook import and connection](../oac/oac-workbook-import.md).

## Failed or interrupted installation

Inspect the failing module's output, verifier and current objects before retrying. Module DDL commits as it runs: an interrupted connection does not roll back objects already created, and create-only scripts cannot be rerun blindly. Fix the observed source/privilege/SQL error and determine which steps remain. Reconnect with initialized session inputs when required; do not drop schemas or reset pipelines to bypass a safety gate.
