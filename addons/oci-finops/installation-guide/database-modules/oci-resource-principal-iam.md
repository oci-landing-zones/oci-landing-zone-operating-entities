# OCI IAM prerequisites for FOCUS ingestion

This page covers the **ADB Resource Principal**, used by ingestion with either Python or direct SQL installation. Start by checking the IAM resources already supplied by the Landing Zone, then complete only the permissions missing for the chosen FOCUS source. The add-on installer does not create IAM groups or policies.

## Contents

- [Check the Landing Zone prerequisites](#check-the-landing-zone-prerequisites)
- [Check ADB dynamic-group membership](#1-include-the-adb-in-a-dynamic-group)
- [2. Choose the source policy](#2-choose-the-source-policy)
  - [2.1 Oracle-managed reports in OC1](#21-oracle-managed-reports-in-oc1)
  - [2.2 Customer-owned report bucket](#22-customer-owned-report-bucket)
- [Database credential](#3-enable-the-database-credential)

## Check the Landing Zone prerequisites

First check the [ADB dynamic-group membership](#1-include-the-adb-in-a-dynamic-group). This is required for either source. For the Landing Zone ADB, reuse its existing compartment-based group; for another ADB, complete membership only if it is missing.

### Choose one report source

Follow **only one** of the following alternatives:

| Your selected source | Follow |
| --- | --- |
| **A. Oracle-managed FOCUS reports in OC1** | [Check the existing Landing Zone endorsement and complete it only if missing](#21-oracle-managed-reports-in-oc1). Skip the customer-bucket section. |
| **B. FOCUS reports in a customer-owned bucket in the ADB's tenancy** | [Check or grant reads on that selected bucket](#22-customer-owned-report-bucket). Skip the Oracle-managed report endorsement. |

Source selection is independent of public/private network connectivity. The [Python guide](python-installation.md#supported-python-authentication) owns the installation operator's authentication and permissions; those are separate from the ADB permissions here.

## 1. Include the ADB in a dynamic group

For the Landing Zone ADB, inspect the existing dynamic group's rule and confirm the actual ADB compartment is covered. Membership follows the compartment rule; no per-database resource-ID entry is needed. Do not create a duplicate group when this is already configured.

If an ADB outside that setup is not covered, create or extend the intended dynamic group. For example, a rule including Autonomous Databases in one compartment is:

```text
ALL {resource.type = 'autonomousdatabase', resource.compartment.id = '<ADB_COMPARTMENT_OCID>'}
```

Use the actual compartment OCID. This example includes all Autonomous Databases in that compartment; verify that this is the intended scope. An existing Landing Zone rule can be broader and should be assessed in its existing context. Use the selected group's actual name, with identity-domain qualification where required, in the policies below. See Oracle's [ADB Resource Principal prerequisites](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/resource-principal.html).

## 2. Choose the source policy

Complete **either 2.1 or 2.2**, according to the selected report source.

### 2.1 Oracle-managed reports in OC1

Apply this section only for **Oracle-managed FOCUS reports in commercial realm OC1**. With the Landing Zone, first check the existing root policies: the report-tenancy endorsement is already part of that setup. Confirm that its subject is the dynamic group covering this ADB. Add statements only if they are missing or do not cover the intended group.

The following is Oracle's published OC1 report-tenancy example, placed in the customer tenancy's root compartment:

```text
Define tenancy usage-report as ocid1.tenancy.oc1..aaaaaaaaned4fkpkisbwjlr56u7cj63lf3wffbilvqknstgtvzub7vhqkggq
Endorse dynamic-group <ADB_DYNAMIC_GROUP> to read objects in tenancy usage-report
```

Replace the group placeholder; retain Oracle's fixed reporting-tenancy identifier. Reuse an existing equivalent definition/endorsement instead of adding duplicates. See Oracle's [ADB cost-report policy example](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/oci-resources-cost-usage-views.html).

The ADB source discovery also calls Identity `ListRegionSubscriptions` to find the customer tenancy's home region. Check the existing policies cover that operation; if missing, the corresponding statement is:

```text
Allow dynamic-group <ADB_DYNAMIC_GROUP> to inspect tenancies in tenancy
```

The permission mapping is documented in Oracle's [IAM API reference](https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/iampolicyreference.htm). The source uses namespace `bling`, the customer tenancy OCID as the report bucket name and the home region; see Oracle's [report storage description](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/download-cost-usage-report.htm).

**Realm scope:** verify the actual tenancy realm. This example covers OC1 only. The current installer has no realm-selection setting and constructs `oraclecloud.com` endpoints; do not reuse the OC1 reporting-tenancy identifier for another realm or assume that this guide establishes support for it.

### 2.2 Customer-owned report bucket

Apply this section only if the selected FOCUS source is an existing **customer-owned bucket**, rather than Oracle-managed reports. Check whether an existing policy already grants the ADB dynamic group the required object access. If not, scope the grant to the selected bucket:

```text
Allow dynamic-group <ADB_DYNAMIC_GROUP> to read objects in compartment id <BUCKET_COMPARTMENT_OCID> where target.bucket.name = '<BUCKET_NAME>'
```

Use the bucket's actual compartment/name and an appropriate policy attachment scope. This permits report-object listing and reads; it is not the Oracle report-tenancy endorsement. Bucket endpoint reachability and IAM authorization are separate requirements. See Oracle's [Object Storage policy reference](https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/objectstoragepolicyreference.htm).

## 3. Enable the database credential

Module 00 enables/verifies the database Resource Principal credential and its use by the platform schema. No additional manual database-grant procedure is required for a fresh installation. The [schema design](../../design/00-schema-bootstrap.md) owns that SQL setup; it does not create the IAM dynamic group or policies checked above.

> **Allow time for initial access to become available.** The first OCI access check may fail after the database credential has been enabled, particularly when the associated IAM policies or dynamic-group membership have just changed. Allow those changes to propagate and cached Resource Principal tokens to refresh, then retry the source preflight before continuing installation. Oracle documents this [Resource Principal caching behavior](https://docs.oracle.com/en-us/iaas/autonomous-database-serverless/doc/resource-principal.html); it does not establish a fixed waiting time for the database grant itself. If access still fails, check the credential, group membership and source policies before rerunning installation scripts.

Validate source access with the **ADB Resource Principal in the target database**. The operator's local OCI access does not prove that the ADB can read reports. Check source preflight, pipeline results and expected-file coverage separately; a successful source listing is not evidence of a complete load.
