# OCI FinOps Database Configuration Guide

This guide configures FinOps after the Landing Zone add-on infrastructure has been deployed. It covers database credentials and Secrets, and installation of the FinOps database modules using Python.

## Prerequisites

Complete the [FinOps Landing Zone Add-on deployment](../deployment/FinOps_LandingZone_addon/README.md), including its prerequisites and readiness checks, before starting this guide.

## Configuration steps

Complete the following steps in order:

1. [Prepare database credentials and Secrets](#step-1-prepare-database-credentials-and-secrets).
2. [Install the FinOps database modules](#step-2-install-the-finops-database-modules).

Infrastructure provisioning does not create the password Secrets. Complete Step 1 before installing the database modules.

## Step 1: Prepare database credentials and Secrets

### Change the initial ADMIN password

After the ADB is available, change its initial ADMIN password before running the FinOps installer. Use the [Autonomous Database ADMIN password procedure](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/manage-users-create.html). Confirm that the new password works against the intended database.

The creation password in the private IaC input is a bootstrap credential. Coordinate its subsequent management with the infrastructure owner so a later Terraform apply does not unintentionally restore that bootstrap value.

### Create the password Secrets

The [security configuration](../deployment/FinOps_LandingZone_addon/finops_security.json) provisions the Vault and encryption key, **not the Secrets**. After provisioning, create the following Secrets in **`vlt-lz-finops`**, in **`cmp-lz-security`**, in the same region as the ADB. Use the single encryption key `key-lz-finops-adb-admin`, created during infrastructure deployment, for all three Secrets. Follow the [OCI procedure for creating a Secret](https://docs.oracle.com/en-us/iaas/Content/secret-management/Tasks/create-secret.htm).

| Secret name | Content | Purpose |
| --- | --- | --- |
| `sec-lz-finops-adb-admin` | The **new, current ADMIN password**, after the change above. | Connect to the existing ADB as ADMIN. It must match the database password, not the bootstrap value. |
| `sec-lz-finops-adb-focus-platform` | A chosen password for `FOCUSPLATFORM`. | The module installer creates the schema owner using this password. |
| `sec-lz-finops-adb-oac-focus-reader` | A chosen password for `OAC_FOCUS_READER`. | The module installer creates the OAC reporting account using this password. |

Store only the raw password in each Secret, not a JSON document, username or connection string. With the Console, use manual secret content entry. Each Secret must be `ACTIVE` with the intended password in its `CURRENT` version. Choose database-compatible passwords; installer inputs must not contain double quotes or line breaks. Do not create the two schema accounts manually as part of this step.

## Step 2: Install the FinOps database modules

### Database prerequisites

The Python installer requires a compatible ADB with working connectivity, credentials and OCI authorization for the selected source and modules. Complete the [ADB Resource Principal and IAM prerequisites](database-modules/oci-resource-principal-iam.md): dynamic-group membership applies to both report sources; policies depend on Oracle-managed reports or a customer bucket.

The ADB, compartments, Vault, Secrets and tags must match the [installer prerequisite table](database-modules/python-installation.md#resources-that-must-already-exist).

### Install with Python

Follow the [Python installation guide](database-modules/python-installation.md). Run configuration, validation and installation in that order. Validation checks ADMIN Secret access and a read-only connection to ADB; installation checks the required source/module access before proceeding.

After installation, use [ADB maintenance and diagnostics](database-modules/maintenance-and-diagnostics.md) for SQL health checks, restart procedures and optional maintenance.

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
