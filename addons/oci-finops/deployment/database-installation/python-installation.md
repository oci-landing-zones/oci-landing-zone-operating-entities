# Install the FinOps add-on schemas with Python

Use the Python installer to create the FinOps schemas and install the database modules in the existing Landing Zone ADB. Resources must match the discovery requirements below.

Complete the [database prerequisites](README.md#database-prerequisites) before running the installer.

## Contents

- [Prerequisites](#prerequisites)
  - [Resources that must already exist](#resources-that-must-already-exist)
  - [Wallet and files prepared by Python](#wallet-and-files-prepared-by-python)
  - [Installation host requirements](#installation-host-requirements)
  - [Supported Python authentication](#supported-python-authentication)
  - [FOCUS report source](#focus-report-source)
    - [Required layout for your own bucket](#required-layout-for-your-own-bucket)
  - [Bucket access for the installation operator](#bucket-access-for-the-installation-operator)
- [Installation](#installation)
  - [Configure, validate and install](#configure-validate-and-install)
  - [Verify installation and read-only status](#verify-installation-and-read-only-status)
    - [Module verification and background results](#module-verification-and-background-results)
  - [OAC connection](#oac-connection)
- [Other operations](#other-operations)
  - [Install optional modules later](#install-optional-modules-later)
  - [Change a tag profile](#change-a-tag-profile)
    - [Tag specification](#tag-specification)
  - [Compatibility limits](#compatibility-limits)
  - [Failed or interrupted installation](#failed-or-interrupted-installation)

## Prerequisites

### Resources that must already exist

These are discovery requirements in `deployment/database-installation/python/finops_addon.py`, not suggested example names. Each named compartment must be active and visible exactly once. Vault, Secrets and ADB must each have exactly one eligible match in the stated scope.

| Resource | Required name or value | Required condition |
| --- | --- | --- |
| OCI region | Region recognized by the installed OCI SDK | Its short key determines the ADB name; `eu-frankfurt-1` becomes `fra`. |
| ADB compartment | `cmp-finops` | Active, accessible and unambiguous in the tenancy. |
| Existing ADB | `adb-<region-key>-lz-finops`; Frankfurt: `adb-fra-lz-finops` | `AVAILABLE` in `cmp-finops` in the selected region. Display name or database name must match; comparison is case-insensitive. |
| Vault compartment | `cmp-lz-security` | Active, accessible and unambiguous in the tenancy. |
| Vault | `vlt-lz-finops` | Exactly one `ACTIVE` Vault with that display name in `cmp-lz-security`, in the selected region. |
| ADMIN password Secret | `sec-lz-finops-adb-admin` | `ACTIVE` in that Vault; `CURRENT` raw password must match the existing ADB's ADMIN password. |
| Schema password Secret | `sec-lz-finops-adb-focus-platform` | `ACTIVE` in that Vault; `CURRENT` raw password is used to create `FOCUSPLATFORM`. |
| Reader password Secret | `sec-lz-finops-adb-oac-focus-reader` | `ACTIVE` in that Vault; `CURRENT` raw password is used to create `OAC_FOCUS_READER`. |
| Tag namespace | `tagns-lz-cost-governance` | Existing namespace containing all six active governance tags below. Python selects this governed profile. |
| Governance tag definitions | `tag-lz-cost-center`, `tag-lz-platform`, `tag-lz-environment`, `tag-lz-owner`, `tag-lz-business-unit`, `tag-lz-project` | Active in that namespace; the installer reads definitions, not creates them. |
| OCI identity running Python | API-key profile, session-token profile or Instance Principal | Can inspect named compartments, ADB, Vault and Secret metadata; download the wallet; and read the current Secret bundles during validation/installation. |
| ADB Resource Principal | Dynamic-group membership containing this ADB; group/policy names are not fixed | Authorized for the FOCUS source, required tag/account/commercial APIs and every selected optional module. Operator access alone does not establish ADB access. |
| Database connection | ADMIN credentials and host network/DNS path to ADB | SQL*Plus can reach the endpoint; prepare VPN/Bastion routing and any descriptor edit before validation. |
| FOCUS source | Oracle-managed reports or a customer bucket you specify | ADB Resource Principal can read it. Customer bucket name/prefix are configurable, not fixed discovery names. |
| Notifications, if enabled | Existing topic OCID you supply | `ACTIVE`, with ADB publish permission and a confirmed email subscription. Leave blank to skip email. |

Secrets contain raw passwords, not JSON. Follow the [ADB password requirements](README.md#password-requirements). The installer preserves permitted special characters and does not impose an initial-letter rule. Existing populated add-on schemas are not a fresh-install target. The [IAM reference](oci-resource-principal-iam.md) gives source-specific policies; module preflight verifies actual access.

**Resource names and credential-storage conventions must match this table.** The installer does not discover arbitrary naming conventions. Resolve mismatches with the infrastructure owner before proceeding; do not rename existing customer resources blindly.

### Wallet and files prepared by Python

A pre-existing ZIP with a particular wallet filename is **not** required. Python downloads the ADB wallet when the local copy is absent, or reuses the existing files under the derived directory.

| Local artifact | Exact path or name | Preparation |
| --- | --- | --- |
| Wallet directory | `~/.finops-platform/wallets/adb-<region-key>-lz-finops/` | Created under the current user's home. Frankfurt: `~/.finops-platform/wallets/adb-fra-lz-finops/`. |
| Wallet source connection | Exactly one usable `*_high` entry in `tnsnames.ora` | Comes from the downloaded/reused wallet; its service prefix depends on ADB. |
| Add-on TNS alias | `FOCUSPLATFORM` in that `tnsnames.ora` | Generated by copying HIGH. A conflicting existing alias is rejected and preserved. ADMIN and schema logins use the same alias. |
| Wallet configuration | `sqlnet.ora` and `TNS_ADMIN` | Python resolves the wallet-directory placeholder, backs up changed settings and sets `TNS_ADMIN` for SQL*Plus. |
| Local choices | `deployment/database-installation/config/database-install.json` | Written by `configure`, ignored by Git; identifiers/selections only. |

The wallet does not create private connectivity. The configurator prints its exact `tnsnames.ora` path; make environment-specific descriptor edits before validation. Inspect a reused wallet/conflicting alias rather than overwriting it blindly.

### Installation host requirements

Prepare a host with the following tools and access before running the installer. Use the supported operating system and software installation method appropriate to your environment.

| Requirement | Required capability or version |
| --- | --- |
| Repository checkout | A complete local clone of this repository, including the full `addons/oci-finops/deployment/` tree and its module `internal/` and `verify/` files. Keep its directory structure intact. |
| Git | A supported Git release for cloning/updating the checkout. This repository does not impose a Git-specific minimum version. |
| Python | Python **3.10 or later**, with an environment containing the packages pinned in `deployment/database-installation/python/requirements.txt`. |
| Python OCI dependencies | OCI SDK `2.189.0` and OCI CLI `3.95.1`, as currently pinned in the requirements file. The installer uses the SDK; the CLI is available for operator-side authentication tasks. |
| SQL*Plus | A working SQL*Plus executable on `PATH`, with compatible Oracle client libraries. If using Instant Client, Basic/Basic Light and SQL*Plus packages must be from the same release. The installer does not enforce a numeric client-version floor. |
| OCI access | Access to the selected region's OCI APIs and the resource-discovery/Vault permissions in the prerequisite table above. |
| Database connectivity | A working route/DNS resolution to the ADB endpoint and the environment's required private access. Resolve any descriptor changes before validation. |

Run Python commands from the add-on directory, `addons/oci-finops/`, using the prepared Python environment. Paths starting with `deployment/` in this guide are relative to that directory.

### Supported Python authentication

Choose one supported OCI authentication method in the configurator. Prepare its credentials and IAM permissions using your organization's normal process.

| Method | Required preparation |
| --- | --- |
| `API_KEY` | A valid OCI configuration profile and signing key accessible to the installation process. |
| `SECURITY_TOKEN` | A valid OCI session-token profile with its token/signing key; keep the session valid throughout configuration and installation. |
| `INSTANCE_PRINCIPAL` | Execution on an OCI Compute instance whose dynamic-group policies authorize the required operations. No local user profile is needed. |

These methods authenticate the Python process. The ADB Resource Principal used by installed SQL is separate and still needs its own IAM authorization. Passwords, signing keys, session tokens and wallets stay outside the repository.

### FOCUS report source

The configurator uses one editable form for both Oracle-managed reports and your own bucket. Defaults point to Oracle-managed FOCUS reports:

| Field | Default | Can be changed? |
| --- | --- | --- |
| Bucket region | Authenticated tenancy's home region, discovered through Identity | Yes, to another region in the same realm. |
| Object Storage namespace | `bling` | Yes, for your own bucket. |
| Bucket name | Authenticated tenancy OCID | Yes. |
| Reports prefix | `FOCUS Reports/` | Yes; enter `/` for the bucket root. |

Enter prefixes as plain text, not URL-encoded text. The installer encodes them when building URLs. The OCI SDK resolves the realm domain from the region; no realm question is required. The operator needs access to list the tenancy's region subscriptions to discover its home region. Existing configurations using empty Oracle-managed defaults are resolved before execution.

The `bling` namespace selects the Oracle-managed year/month/day layout. Oracle documents the default namespace, bucket and [FOCUS report structure](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/list-cost-usage-report.htm). Confirm the selected prefix actually contains FOCUS reports; a successful empty listing does not establish report availability.

#### Required layout for your own bucket

Place four-digit year folders immediately below the chosen prefix, or at the bucket root when no prefix is selected:

```text
<optional-prefix>/
└── 2026/
    ├── report.csv.gz
    └── optional-subfolders/
        └── another-report.csv.gz
```

Files must be gzip-compressed CSVs compatible with this module's OCI FOCUS column order and timestamp formats; see the [ingestion contract](../../design/02-oci-ingestion.md). Arbitrary CSVs or another provider's FOCUS variant are not automatically mapped. At least one year folder must be discoverable before installation. Subfolders below the year are optional for your own bucket.

One pipeline is created per selected year, preventing different yearly pipelines from selecting the same object. For Oracle-managed reports, its location ends in `/<prefix>/<year>/*/*/*.csv.gz`. For your own bucket, it uses `/<prefix>/<year>/.*[.]csv[.]gz` with `regexuri=true` to match compressed CSVs at any depth below that year. The prefix is omitted from either pattern when it is empty.

### Bucket access for the installation operator

Python checks the location with the operator's identity. For Oracle-managed reports it calls `ListObjects`; no `GetBucket` permission is required. For your own bucket it calls `GetBucket` to verify metadata access. For a user-group identity, an example scoped to that bucket is:

```text
Allow group <INSTALLER_USER_GROUP> to read buckets in compartment id <BUCKET_COMPARTMENT_OCID> where target.bucket.name = '<BUCKET_NAME>'
```

For Instance Principal, use the installation Compute instance's authorized dynamic group instead. Reuse existing equivalent permissions. These checks do not establish ADB report access: installation separately checks listing with the ADB Resource Principal and discovers year folders. See Oracle's [Object Storage API permission mapping](https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/objectstoragepolicyreference.htm).

## Installation

### Configure, validate and install

With the environment prepared, enter the add-on directory from the root of your checkout and run:

```text
cd addons/oci-finops
python deployment/database-installation/python/finops_addon.py configure
python deployment/database-installation/python/finops_addon.py validate
python deployment/database-installation/python/finops_addon.py install
```

| Command | Result |
| --- | --- |
| `configure` | Discovers named resources, prepares wallet/alias, collects the report bucket/first year, optional Notifications topic, scheduler time zone and optional modules, then saves local choices. |
| `validate` | Reads the ADMIN Secret and checks a read-only SQL*Plus connection through the alias. Complete private connectivity first. |
| `install` | Confirms before DDL, creates schema/reader, checks Resource Principal APIs and runs mandatory plus selected optional module SQL. |

The mandatory set is schema, shared core, OCI ingestion, governed tag catalog/profile, account/contracts and OAC cost detail. Optional modules are historical tag values, Budgets, Cloud Advisor, Cost Anomalies and Native Forecast. Their API access and capacity requirements still apply; schedules use built-in defaults and one shared time zone.

Year pipelines are created stopped. After OAC's initial empty COMPLETE MV build, ingestion starts. A background gate enables recurring OAC refresh after initial catch-up and a successful FAST refresh. Structural PASS alone does not establish completion or source coverage.

### Verify installation and read-only status

```text
python deployment/database-installation/python/finops_addon.py status --short
```

Check expected modules and background pipeline/source/MV results before using reporting data.

Use the saved local configuration, valid OCI session and working private connection. For a filtered report with full detail:

```text
python deployment/database-installation/python/finops_addon.py status --module advisor,forecast --long
```

`--short` shows structural/object-type totals and essential pipeline state; `--long` is the default and adds object lists, jobs, source audits and MV state. The flags are mutually exclusive. Without `--module`, all known modules are reported, including absent ones. Every selection includes shared core, ingestion, tag catalog/profile and account/contracts; `core` names that reporting group.

Valid names: `all`, `core`, `ingestion`, `tags`, `accounts`, `tag-values`, `budgets`, `advisor`, `anomalies`, `forecast`, `oac-cost`. Existing `oci_*` installer names and `oac_cost_detail` remain aliases. Use `all` alone. Empty/unknown names are rejected before OCI access.

The report separates missing/partial/invalid/installed objects, job enablement versus execution and source results. Oracle pipeline/history/file-tracking metadata is authoritative; load-log evidence does not override it. An empty tracking table means NO RECORDS; a missing one means NO TRACKING TABLE. Job results are scoped to the current job incarnation. FOUND counts objects, not data rows; INVALID is a subset of FOUND. Disabled retention/refresh jobs can be intentional.

`status` reads the FOCUSPLATFORM password Secret and queries the database; it does not probe source APIs, repair, refresh or start jobs. Exit zero means the report ran, not that source coverage is complete. Current connection/SQL/check errors return nonzero; historical job failures remain report findings. For SQL diagnostic reports, see [maintenance and diagnostics](maintenance-and-diagnostics.md).

#### Module verification and background results

Python runs the module installers and their verifiers in dependency order. The following markers describe structural checks, not complete source coverage:

| Component | Structural result |
| --- | --- |
| 00 — Schema, as `ADMIN` | `FOCUSPLATFORM SCHEMA VERIFICATION PASS` |
| 01 — Shared core, as `FOCUSPLATFORM` | `FINOPS CORE VERIFICATION PASS` |
| OCI 00 — Ingestion and remediation | `OCI INGESTION VERIFICATION PASS` |
| OCI 01a — Tag definitions and profile | `OCI TAG CATALOG AND PROFILE VERIFICATION PASS` |
| OCI 02 — Account context and contracts | `OCI ACCOUNT CONTEXT AND CONTRACT VERIFICATION PASS` |
| OCI 01b — All defined-tag values | `OCI TAG VALUE EXTRACTION VERIFICATION PASS` |
| OCI 03 — Budgets | `OCI BUDGETS VERIFICATION PASS` |
| OCI 04 — Cloud Advisor | `OCI CLOUD ADVISOR VERIFICATION PASS` |
| OCI 05 — Cost Anomalies | `OCI COST ANOMALY VERIFICATION PASS` |
| OCI 06 — Native Forecast | `OCI NATIVE FORECAST VERIFICATION PASS` |
| 03 / OAC — Database source | `OAC COST DETAIL STRUCTURE PASS` |
| Start — OCI pipelines | Pipelines start only after MV `COMPLETE` and `VALID` checks |

Source preflight runs before module DDL. It establishes API access for that attempt; structural PASS markers do not prove that later background work completed.

| Component | Installation and acceptance checks |
| --- | --- |
| Shared core | The initial self-check calls `FINOPS_CORE_RUN_DAILY('N')` and records an audit without sending email. The verifier checks objects, configuration, selected time zone and enabled daily job. Confirm email delivery separately using [coordinator diagnostics](maintenance-and-diagnostics.md#coordinator-and-notification-diagnostics). |
| Ingestion | Pipelines are configured stopped. Pipeline startup waits one minute for an initial configuration/status snapshot and requests an asynchronous run of the existing common daily job. Later file/row outcomes require pipeline metadata and remediation ledgers. Retention stays disabled until enabled through the maintenance procedure. |
| Tag catalog/profile | Validate the core, clean module state, Resource Principal and requested specification before DDL. Initial catalog sync and profile selection precede the structural gate. The initial governed installation requires the reserved default profile. Module SQL has no ordinal-choice prompts. |
| Account context/contracts | Preflight checks Identity and commercial discovery. Successful Identity queries alone do not establish commercial source access. Required source checks must succeed before installation proceeds. Initial context and contract runs are asynchronous: inspect both audits and the source-result report, not only job submission. |
| Tag values | The structural gate checks metadata and code, then requests an immediate background run. It does not establish historical completion. Inspect `OCI_TAG_VALUE_RUN`, configuration/cursor progress and Scheduler history before accepting backfill. |
| Budgets, Advisor, Anomalies, Forecast | Each checks its API access, creates its objects and requests background synchronization. The structural verifier and source-result report answer different questions. |
| OAC cost detail | The initial verifier can report `OAC COST DETAIL SYNONYM READY; INITIAL POPULATION PENDING`. After population, rerun it and require `OAC COST DETAIL BUILD PASS`. Check a valid FAST-refreshable published MV, its staleness/compile state and totals by charge period/currency before creating OAC datasets. Scheduler success alone does not prove a complete first population. |

The module's `verify/` scripts provide its structural and source-result checks. [Shared diagnostics](maintenance-and-diagnostics.md#installation-inventory-and-dependencies) report whole-solution inventory without replacing module-specific checks.

### OAC connection

When schema/source checks pass, continue with [OAC service preparation](../oac-configuration/oac-service-setup.md) and [workbook import and connection](../oac-configuration/oac-workbook-import.md). Those guides own the OAC service/catalog steps.

## Other operations

### Install optional modules later

```text
python deployment/database-installation/python/finops_addon.py preflight --module oci_budgets,oci_cloud_advisor
python deployment/database-installation/python/finops_addon.py install-module --module oci_budgets,oci_cloud_advisor
```

Valid IDs: `oci_tag_values`, `oci_budgets`, `oci_cloud_advisor`, `oci_cost_anomalies`, `oci_forecast`. The mandatory baseline must exist. Module-scoped preflight checks shared prerequisites and selected source APIs; tag-value extraction checks installed landing/catalog instead of a separate API. Optional modules use built-in settings; no extra per-module wizard values are needed.

`install-module` confirms the list and completes selected prechecks before DDL. It does not recreate the schema or baseline. Optional modules must be absent; installed/partial objects cause a safety stop. A later runtime error can leave earlier selected modules committed: inspect their verifiers before retrying.

### Change a tag profile

Save a [tag specification](#tag-specification) as a local JSON file. With the existing database configuration and credentials:

```bash
python deployment/database-installation/python/finops_addon.py apply-tag-profile --spec tag-profile.json
python deployment/database-installation/python/finops_addon.py refresh-tag-profile
python deployment/database-installation/python/finops_addon.py build-tag-mv
python deployment/database-installation/python/finops_addon.py publish-tag-mv --run-id 123
```

Replace `123` with the specific validated READY candidate. Publication is explicit; these are independent operations. Every command supports `-h`. Python reads the tag JSON file and invokes the corresponding database operations. Applying a profile does not build an MV; refreshing a profile reuses its stored specification. A build leaves the candidate at READY without moving the published synonym. Before publication, inspect the build audit, mapping and row counts, candidate validity and workbook compatibility. Publication requires the exact READY run ID and a match with the active profile; a profile change after building rejects a stale candidate.

See the [profile design](../../design/02-oci-tags.md#reporting-column-contract) for slot/version rules and the [compatibility limits](#compatibility-limits) for existing schemas.

#### Tag specification

`schema_version`, `profile_name` and `mode` are required. Profile names are 1–128 uppercase letters/digits/underscores, beginning with a letter. Namespaces and tag names are case-sensitive existing names, not ordinals. Use exactly one of the following:

[NAMESPACE JSON example](config/tag-profile.namespace.example.json):

```json
{"schema_version":1,"profile_name":"CUSTOM_COST_REPORTING","mode":"NAMESPACE","namespace":"Finance"}
```

[TAG_LIST JSON example](config/tag-profile.list.example.json):

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

### Compatibility limits

Fresh installations create the profile `SPEC_JSON` and item `IS_ACTIVE` columns and allow mixed-profile header namespaces. Existing databases need a reviewed migration preserving profile revisions, published mappings and slot identities. Do not run create-only installers over populated modules or expect the old mixed-profile delegate to upgrade them. Review automation that depended on prompts or dense renumbering.

Before production use, validate Oracle compilation, grants, FAST refresh with retired typed-NULL columns, concurrent profile behavior and any existing-schema migration in a disposable Oracle environment.

### Failed or interrupted installation

DDL may already be committed. Inspect local logs and the affected module's verifier before retrying. After a Resource Principal preflight stop, Python can reuse bootstrap only when both users are open, expected grants/ADMIN credential exist, FOCUSPLATFORM has no objects and schema verification passes. Other existing states stop for inspection; do not delete/reset schemas to bypass this gate.

Preflight reports source access and readiness for each selected module. Required checks must succeed before module installation proceeds. Running preflight on its own requires an existing open FOCUSPLATFORM account and does not bootstrap it.

Ctrl+C during configuration saves no partial config, though a downloaded wallet can remain. Interrupting installation does not undo committed SQL. Vault rotation alone does not update database passwords; keep account passwords and Secrets aligned.

After pipeline startup, use the running-state verifier instead of the stopped-state structural verifier. Started pipelines and successful jobs alone do not prove a successful load. Check initial FAST refresh and published MV state separately.

A complete installation requires account/contracts and verified commercial access in the target tenancy.
