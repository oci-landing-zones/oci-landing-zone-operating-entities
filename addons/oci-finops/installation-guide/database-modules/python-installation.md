# Install the FinOps add-on schemas with Python

Use this route when the existing Landing Zone resources match the exact names below. For a different resource/credential convention, use [direct SQL](manual-sql-installation.md).

The [common deployment prerequisites](../README.md#common-database-prerequisites) apply to this route.

## Contents

- [Resources that must already exist](#resources-that-must-already-exist)
- [Wallet and files prepared by Python](#wallet-and-files-prepared-by-python)
- [Installation host requirements](#installation-host-requirements)
- [Supported Python authentication](#supported-python-authentication)
- [Customer bucket metadata access](#customer-bucket-metadata-access)
- [Configure, validate and install](#configure-validate-and-install)
- [Verify installation and read-only status](#verify-installation-and-read-only-status)
- [Install optional modules later](#install-optional-modules-later)
- [Change a tag profile](#change-a-tag-profile)
- [OAC connection](#oac-connection)
- [Failed or interrupted installation](#failed-or-interrupted-installation)

## Resources that must already exist

These are discovery requirements in `deployment/python/finops_addon.py`, not suggested example names. Each named compartment must be active and visible exactly once. Vault, Secrets and ADB must each have exactly one eligible match in the stated scope.

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

Secrets contain raw passwords, not JSON. New-user passwords must satisfy ADB rules and contain no double quotes or line breaks. Existing populated add-on schemas are not a fresh-install target. The [IAM reference](oci-resource-principal-iam.md) gives source-specific policies; module preflight verifies actual access.

**If these names or credential-storage conventions do not match, use the [direct SQL route](manual-sql-installation.md).** Do not rename customer infrastructure merely to satisfy Python discovery. Missing functional permissions must still be resolved; switching routes does not bypass them.

## Wallet and files prepared by Python

A pre-existing ZIP with a particular wallet filename is **not** required. Python downloads the ADB wallet when the local copy is absent, or reuses the existing files under the derived directory.

| Local artifact | Exact path or name | Preparation |
| --- | --- | --- |
| Wallet directory | `~/.finops-platform/wallets/adb-<region-key>-lz-finops/` | Created under the current user's home. Frankfurt: `~/.finops-platform/wallets/adb-fra-lz-finops/`. |
| Wallet source connection | Exactly one usable `*_high` entry in `tnsnames.ora` | Comes from the downloaded/reused wallet; its service prefix depends on ADB. |
| Add-on TNS alias | `FOCUSPLATFORM` in that `tnsnames.ora` | Generated by copying HIGH. A conflicting existing alias is rejected and preserved. ADMIN and schema logins use the same alias. |
| Wallet configuration | `sqlnet.ora` and `TNS_ADMIN` | Python resolves the wallet-directory placeholder, backs up changed settings and sets `TNS_ADMIN` for SQL*Plus. |
| Local choices | `deployment/config/database-install.json` | Written by `configure`, ignored by Git; identifiers/selections only. |

The wallet does not create private connectivity. The configurator prints its exact `tnsnames.ora` path; make environment-specific descriptor edits before validation. Inspect a reused wallet/conflicting alias rather than overwriting it blindly.

## Installation host requirements

Prepare a host with the following tools and access before running the installer. Use the supported operating system and software installation method appropriate to your environment.

| Requirement | Required capability or version |
| --- | --- |
| Repository checkout | A complete local clone of this repository, including the full `addons/oci-finops/deployment/` tree and its module `internal/` and `verify/` files. Keep its directory structure intact. |
| Git | A supported Git release for cloning/updating the checkout. This repository does not impose a Git-specific minimum version. |
| Python | Python **3.10 or later**, with an environment containing the packages pinned in `deployment/python/requirements.txt`. |
| Python OCI dependencies | OCI SDK `2.189.0` and OCI CLI `3.95.1`, as currently pinned in the requirements file. The installer uses the SDK; the CLI is available for operator-side authentication tasks. |
| SQL*Plus | A working SQL*Plus executable on `PATH`, with compatible Oracle client libraries. If using Instant Client, Basic/Basic Light and SQL*Plus packages must be from the same release. The installer does not enforce a numeric client-version floor. |
| OCI access | Access to the selected region's OCI APIs and the resource-discovery/Vault permissions in the prerequisite table above. |
| Database connectivity | A working route/DNS resolution to the ADB endpoint and the environment's required private access. Resolve any descriptor changes before validation. |

Run Python commands from the add-on directory, `addons/oci-finops/`, using the prepared Python environment. Paths starting with `deployment/` in this guide are relative to that directory. The direct SQL route needs the checkout, SQL*Plus/client and database connectivity; Python dependencies and Python OCI authentication are not required for that route.

## Supported Python authentication

Choose one supported OCI authentication method in the configurator. Prepare its credentials and IAM permissions using your organization's normal process.

| Method | Required preparation |
| --- | --- |
| `API_KEY` | A valid OCI configuration profile and signing key accessible to the installation process. |
| `SECURITY_TOKEN` | A valid OCI session-token profile with its token/signing key; keep the session valid throughout configuration and installation. |
| `INSTANCE_PRINCIPAL` | Execution on an OCI Compute instance whose dynamic-group policies authorize the required operations. No local user profile is needed. |

These methods authenticate the Python process. The ADB Resource Principal used by installed SQL is separate and still needs its own IAM authorization. Passwords, signing keys, session tokens and wallets stay outside the repository.

## Customer bucket metadata access

Only when selecting a customer-owned FOCUS bucket, Python `configure` calls `GetBucket` with the installation operator's identity. Check that identity has bucket-metadata access, separately from the ADB's object-read permission. For a user-group identity, an example scoped to that bucket is:

```text
Allow group <INSTALLER_USER_GROUP> to read buckets in compartment id <BUCKET_COMPARTMENT_OCID> where target.bucket.name = '<BUCKET_NAME>'
```

For Instance Principal, use the installation Compute instance's authorized dynamic group instead. Reuse existing equivalent permissions. This check does not apply to direct SQL installation and does not establish ADB report access. See Oracle's [Object Storage API permission mapping](https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/objectstoragepolicyreference.htm).

## Configure, validate and install

With the environment prepared, enter the add-on directory from the root of your checkout and run:

```text
cd addons/oci-finops
python deployment/python/finops_addon.py configure
python deployment/python/finops_addon.py validate
python deployment/python/finops_addon.py install
```

| Command | Result |
| --- | --- |
| `configure` | Discovers named resources, prepares wallet/alias, collects FOCUS source/first year, optional Notifications topic, scheduler time zone and optional modules, then saves local choices. |
| `validate` | Reads the ADMIN Secret and checks a read-only SQL*Plus connection through the alias. Complete private connectivity first. |
| `install` | Confirms before DDL, creates schema/reader, checks Resource Principal APIs and runs mandatory plus selected optional module SQL. |

The mandatory set is schema, shared core, OCI ingestion, governed tag catalog/profile, account/contracts and OAC cost detail. Optional modules are historical tag values, Budgets, Cloud Advisor, Cost Anomalies and Native Forecast. Their API access and capacity requirements still apply; schedules use built-in defaults and one shared time zone.

Year pipelines are created stopped. After OAC's initial empty COMPLETE MV build, ingestion starts. A background gate enables recurring OAC refresh after initial catch-up and a successful FAST refresh. Structural PASS alone does not establish completion or source coverage.

## Verify installation and read-only status

```text
python deployment/python/finops_addon.py status --short
```

Check expected modules and background pipeline/source/MV results before using reporting data.

Use the saved local configuration, valid OCI session and working private connection. For a filtered report with full detail:

```text
python deployment/python/finops_addon.py status --module advisor,forecast --long
```

`--short` shows structural/object-type totals and essential pipeline state; `--long` is the default and adds object lists, jobs, source audits and MV state. The flags are mutually exclusive. Without `--module`, all known modules are reported, including absent ones. Every selection includes shared core, ingestion, tag catalog/profile and account/contracts; `core` names that reporting group.

Valid names: `all`, `core`, `ingestion`, `tags`, `accounts`, `tag-values`, `budgets`, `advisor`, `anomalies`, `forecast`, `oac-cost`. Existing `oci_*` installer names and `oac_cost_detail` remain aliases. Use `all` alone. Empty/unknown names are rejected before OCI access.

The report separates missing/partial/invalid/installed objects, job enablement versus execution and source results. Oracle pipeline/history/file-tracking metadata is authoritative; load-log evidence does not override it. An empty tracking table means NO RECORDS; a missing one means NO TRACKING TABLE. Job results are scoped to the current job incarnation. FOUND counts objects, not data rows; INVALID is a subset of FOUND. Disabled retention/refresh jobs can be intentional.

`status` reads the FOCUSPLATFORM password Secret and queries the database; it does not probe source APIs, repair, refresh or start jobs. Exit zero means the report ran, not that source coverage is complete. Current connection/SQL/check errors return nonzero; historical job failures remain report findings. Direct SQL uses the same [monitoring manifest/report](maintenance-and-diagnostics.md).

## Install optional modules later

```text
python deployment/python/finops_addon.py preflight --module oci_budgets,oci_cloud_advisor
python deployment/python/finops_addon.py install-module --module oci_budgets,oci_cloud_advisor
```

Valid IDs: `oci_tag_values`, `oci_budgets`, `oci_cloud_advisor`, `oci_cost_anomalies`, `oci_forecast`. The mandatory baseline must exist. Module-scoped preflight checks shared prerequisites and selected source APIs; tag-value extraction checks installed landing/catalog instead of a separate API. Optional modules use built-in settings; no extra per-module wizard values are needed.

`install-module` confirms the list and completes selected prechecks before DDL. It does not recreate the schema or baseline. Optional modules must be absent; installed/partial objects cause a safety stop. A later runtime error can leave earlier selected modules committed: inspect their verifiers before retrying.

## Change a tag profile

Save a [tag specification](manual-sql-installation.md#tag-specification) as a local JSON file. With the existing database configuration and credentials:

```bash
python deployment/python/finops_addon.py apply-tag-profile --spec tag-profile.json
python deployment/python/finops_addon.py refresh-tag-profile
python deployment/python/finops_addon.py build-tag-mv
python deployment/python/finops_addon.py publish-tag-mv --run-id 123
```

Replace `123` with the specific validated READY candidate. Publication is explicit; these are independent operations. Every command supports `-h`. Python reads the tag JSON file, places it in the common CLOB parameter and invokes the same [SQL operations](manual-sql-installation.md#change-a-profile-and-publish-an-mv-candidate).

See the [profile design](../../design/02-oci-tags.md#reporting-column-contract) for slot/version rules and the [migration limits](manual-sql-installation.md#compatibility-limits) for existing schemas.

## OAC connection

When schema/source checks pass, continue with [OAC service preparation](../oac/oac-service-setup.md) and [workbook import and connection](../oac/oac-workbook-import.md). Those guides own the OAC service/catalog steps.

## Failed or interrupted installation

DDL may already be committed. Inspect local logs and the affected module's verifier before retrying. After a Resource Principal preflight stop, Python can reuse bootstrap only when both users are open, expected grants/ADMIN credential exist, FOCUSPLATFORM has no objects and schema verification passes. Other existing states stop for inspection; do not delete/reset schemas to bypass this gate.

Preflight reports source access and readiness for each selected module. Required checks must succeed before module installation proceeds. Running preflight on its own requires an existing open FOCUSPLATFORM account and does not bootstrap it.

Ctrl+C during configuration saves no partial config, though a downloaded wallet can remain. Interrupting installation does not undo committed SQL. Vault rotation alone does not update database passwords; keep account passwords and Secrets aligned.

After pipeline startup, use the running-state verifier instead of the stopped-state structural verifier. Started pipelines and successful jobs alone do not prove a successful load. Check initial FAST refresh and published MV state separately.

A complete installation requires account/contracts and verified commercial access in the target tenancy.
