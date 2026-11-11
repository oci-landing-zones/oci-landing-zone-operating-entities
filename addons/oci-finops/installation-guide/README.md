# FinOps installation

The installation has two parts: create the FinOps add-on schemas in an existing compatible ADB, then prepare the OAC service and workbook.

## Contents

- [Common prerequisites](#common-prerequisites)
- [1. Install the database add-on schemas](#1-install-the-database-add-on-schemas)
- [2. Create and configure OAC](#2-create-and-configure-oac)

## Common prerequisites

The solution requires an OCI **parent tenancy**. Both schema-installation routes use an existing compatible ADB in that tenancy and require working connectivity, credentials and OCI authorization for the selected source/modules. Complete the [ADB Resource Principal and IAM prerequisites](database-modules/oci-resource-principal-iam.md) before installation: dynamic-group membership applies to both sources; policies depend on Oracle-managed reports or a customer bucket. The route guides specify their host and credential requirements.

## 1. Install the database add-on schemas

Both options install the same FinOps schemas and SQL modules in an existing compatible Oracle Autonomous Database (ADB). Choose the route for your environment:

| Your starting point | Choose |
| --- | --- |
| **Your ADB comes from the Landing Zone**, and the ADB, compartments, Vault, Secrets and tags follow the names/prerequisites expected by the installer | **[Option A — Python installer for the Landing Zone](database-modules/python-installation.md)**. Python discovers those resources and guides the installation. |
| **You are not using that Landing Zone setup**, or your existing resources have different names/credential conventions — including an adapted Landing Zone | **[Option B — Direct SQL installation](database-modules/manual-sql-installation.md)**. You supply the connection, credentials and module inputs and run SQL directly against the existing ADB. |

**Coming from the Landing Zone? Start with Option A and check its prerequisite table.** If those conventions do not match your environment, use Option B. Missing IAM permissions, source access or database compatibility must still be resolved with either route.

Each route has a separate guide with a contents index. The ADB must already exist; the add-on installer creates its database objects.

After installation, use [ADB maintenance and diagnostics](database-modules/maintenance-and-diagnostics.md) for SQL health checks, restart procedures and optional maintenance.

## 2. Create and configure OAC

OAC service creation is a separate administration step, performed manually in OCI Console. Use the existing OAC service if your environment already provides one.

1. [Create the OAC service and prepare its ADB connectivity](oac/oac-service-setup.md) when needed.
2. [Import the workbook and configure its database connection](oac/oac-workbook-import.md) using the dedicated OAC reader created with the schemas.
3. [Configure consumer access](oac/oac-user-onboarding.md) before sharing the workbook.
4. Optional: [Index datasets and enable AI Assistant for workbook users](oac/oac-ai-assistant-consumers.md).
