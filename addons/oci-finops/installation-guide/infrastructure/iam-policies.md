# FinOps IAM policies

Reference for the policies currently defined in [finops_iam.json](../../deployment/FinOps_LandingZone_addon/finops_iam.json). Provision them through [the deployment guide](../../deployment/FinOps_LandingZone_addon/README.md); the Python installer does not create IAM policies.

## Contents

- [Provisioned policies and principals](#provisioned-policies-and-principals)
- [ADB runtime policies](#adb-runtime-policies)
- [usage-report or usage-reports](#usage-report-or-usage-reports)
- [Additional access to verify](#additional-access-to-verify)

## Provisioned policies and principals

The three policies are created at the tenancy root; their statements define the actual resource scope.

| Policy | Principal | Purpose |
| --- | --- | --- |
| `pcy-lz-finops-db-admins` | `id_lz_common/grp-lz-finops-db-admins` | ADB administration, database connectivity and required shared-network/Bastion session access. |
| `pcy-lz-finops-oac-admins` | `id_lz_common/grp-lz-finops-oac-admins` | OAC administration, private data-source connectivity and required shared-network/Bastion session access. |
| `pcy-lz-finops-adb-rp` | `id_lz_common/dg-lz-finops-adb` | ADB Resource Principal access to reports, module APIs and Notifications. |

The domain is reused from One-OE. The Dynamic Group matches Autonomous Databases by **FinOps compartment**, rather than by a single database OCID. See [roles and compartment scope](one-oe-integration.md#roles-and-compartment-scope) for the administrator grants and boundaries. Database users and SQL grants are separate from these IAM principals.

## ADB runtime policies

| Grant in the JSON | Consumer / purpose | Statement scope |
| --- | --- | --- |
| `define tenancy reporting` and `endorse ... read objects in tenancy reporting` | Ingestion: Oracle-managed FOCUS files in OC1. | Oracle reporting tenancy; all matching Dynamic Group members. |
| `{ONS_TOPIC_PUBLISH}` | Shared Core operational notifications. | `cmp-landingzone:cmp-lz-platform:cmp-finops`; matching Dynamic Group members. |
| `read tag-namespaces` | Tag catalog and governed reporting profiles. | Tenancy, restricted to the specified ADB OCID. |
| `read usage-budgets` | Optional Budgets collector. | Tenancy, restricted to the specified ADB OCID. |
| `read optimizer-api-family` | Optional Cloud Advisor collector. | Tenancy, restricted to the specified ADB OCID. |
| `read costad-family` | Optional Cost Anomalies collector. | Tenancy, restricted to the specified ADB OCID. |
| `read usage-report` | Optional Native Forecast: Usage API cost/usage queries. | Tenancy, restricted to the specified ADB OCID. |
| `read organizations-family` | Account and contract organization context. | Tenancy, restricted to the specified ADB OCID. |
| `{ORGANIZATIONS_SUBSCRIPTION_INSPECT, SUBSCRIPTION_INFO_READ, SUBSCRIBED_SERVICE_INSPECT}` | Account/contracts commercial subscription and service metadata. | Tenancy, restricted to the specified ADB OCID. |

The API grants use this statement pattern:

```text
Allow dynamic-group 'id_lz_common'/'dg-lz-finops-adb' to read <resource-type> in tenancy where request.principal.id = '<FINOPS_ADB_OCID>'
```

Populate the OCIDs using the [same-stack provisioning sequence](../../deployment/FinOps_LandingZone_addon/README.md#deploy-and-verify). The endorsement and Notifications statements do not contain that per-ADB condition.

The JSON includes grants for optional collectors even if those SQL modules are not selected. For a customer-owned report bucket, use the [source-specific ingestion policy](../database-modules/oci-resource-principal-iam.md#2-choose-the-source-policy); that bucket grant is not defined by this Oracle-managed report endorsement.

## usage-report or usage-reports

For this add-on's Usage API integration, retain **`read usage-report`**, singular: this is the form documented by Oracle's [Cost Analysis / Usage API guide](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/costanalysisoverview.htm). That guide also identifies `USAGE_REPORT_READ` as one of the permissions accepted for cost/usage queries.

Oracle's generic [Common Policies examples](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/commonpolicies.htm) also contain the plural `read usage-reports`. The examples are inconsistent in spelling; they do not establish that both grants are needed. This repository defines the singular form. Validate API access with the selected module's preflight rather than adding a second grant solely because of that spelling difference.

In a statement such as `define tenancy usage-report as ...`, `usage-report` is a **tenancy alias**. It is unrelated to the resource-type spelling: FOCUS file ingestion reads Object Storage `objects`, while Forecast calls the Usage API.

## Additional access to verify

- **Account context:** the SQL preflight and collector call `GetTenancy`, `ListRegionSubscriptions` and `ListCompartments`. Oracle maps these to `TENANCY_INSPECT` and `COMPARTMENT_INSPECT`; see its [IAM API permission reference](https://docs.oracle.com/en-us/iaas/Content/Identity/Reference/iampolicyreference.htm). These grants are not explicit in the current FinOps JSON. Verify that the deployed LZ supplies them to the ADB principal; the static policy catalog does not prove effective authorization.
- **Installation operator:** the Python identity needs separate resource-discovery, wallet and Secret access. Follow the [Python prerequisite table](../database-modules/python-installation.md#resources-that-must-already-exist); ADB runtime grants do not authorize the Python operator.
