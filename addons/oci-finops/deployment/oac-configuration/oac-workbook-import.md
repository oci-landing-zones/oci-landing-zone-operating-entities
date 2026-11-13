# Import the FOCUSPLATFORM OAC workbook

Import the supplied workbook, configure its destination database connection and check the results.

## Contents

- [Package contents and prerequisites](#package-contents-and-prerequisites)
- [Import steps](#import-steps)
- [Acceptance checks](#acceptance-checks)
- [Check the database reader if connection access fails](#check-the-database-reader-if-connection-access-fails)
- [After reporting profile changes](#after-reporting-profile-changes)
- [Updating the package](#updating-the-package)

## Package contents and prerequisites

Download [FOCUSPLATFORM_OAC_FINOPS_DASHBOARDS.dva](export/FOCUSPLATFORM_OAC_FINOPS_DASHBOARDS.dva). It includes eight canvases, 41 visualizations and their datasets. It contains no exported cost data or connection credentials and requires no import password. Its connection definition, `conn_focus_prd_adb`, must be configured for the destination.

Before importing, confirm:

- OAC is at the source update level or later; avoid importing from a newer update into an older one.
- [OAC-to-ADB connectivity](oac-service-setup.md) is ready, and you can import content and configure connections.
- The database installation includes the landing, active tag profile, published OAC cost-detail source and Cloud Advisor module required by this package.
- The reporting account can query these `FOCUSPLATFORM` objects: `OAC_OCI_FOCUS_COST_DETAIL`, `OAC_OCI_FOCUS_TAG_SLOT_V`, `OCI_ADVISOR_ACTIONS_V`, `OCI_ADVISOR_RECOMMENDATIONS_V` and `OCI_ADVISOR_SYNC_RUN`.

The workbook uses six generic columns, `TAG_1` to `TAG_6`. Resolve their meanings through `OAC_OCI_FOCUS_TAG_SLOT_V`. Fewer slots require removing affected charts/formulas; more slots require additional visuals to expose them.

## Import steps

1. Sign in to OAC. For team use, select the approved **Shared Folders** destination in Catalog before importing. Importing from Home places content in **My Folders**.
2. Choose **Import Workbook/Flow**, select the downloaded DVA and import. No package password is expected. Avoid replacing an existing workbook unintentionally.
3. Wait for **Import Successful** and open the workbook.
4. In **Navigator → Data → Connections**, open `conn_focus_prd_adb` → **Actions → Inspect**. Set the destination ADB endpoint, required wallet/connection settings and `OAC_FOCUS_READER` credentials. Test and save. Do not use the source environment's credentials.
5. Refresh dataset metadata and workbook data. If a dataset reports a missing connection, bind it to the configured connection, retaining `FOCUSPLATFORM` and the existing column names.
6. Complete the acceptance checks below, then [share the workbook and its dependencies](oac-user-onboarding.md). Do not create a separate connection for every viewer.

Use the Data connection referenced by the imported datasets, rather than the separate semantic-model connection administration. See Oracle's [workbook import procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/import-workbook-file.html).

## Acceptance checks

- All eight canvases open: **Overview**, **Month-To-Date Comparison**, **Details Owner Consumption**, **Tag Analysis**, **Forecast**, **Advisor**, **Anomalies** and **Canvas 13**.
- Cost totals agree with the destination database for the same period, currency and filters.
- Tag slots have the expected meanings and coverage; Advisor queries the destination's views.
- There are no missing-dataset/connection errors. Test the imported datasets against the destination rather than treating import success as proof of fresh data.
- An intended viewer can use the workbook in their own session after [consumer access setup](oac-user-onboarding.md).

## Check the database reader if connection access fails

Module 00 creates `OAC_FOCUS_READER` and its grants. Check the connection targets the correct ADB and uses that account. Test as the reader:

```sql
SELECT COUNT(*) FROM FOCUSPLATFORM.OAC_OCI_FOCUS_COST_DETAIL;
```

For database authorization failures, have the DBA compare the [access contract](../../design/00-schema-bootstrap.md#created-objects-and-access) and use the [reader grant verification/repair script](../database-installation/sql/install/00_schema/01_grant_oac_reader_access.sql) when appropriate. OAC metadata HTTP 403 errors instead require checking [dataset and connection sharing](oac-user-onboarding.md#troubleshooting).

## After reporting profile changes

[Apply the profile, build and explicitly publish its candidate with Python](../database-installation/python-installation.md#change-a-tag-profile), then refresh OAC dataset metadata and review presentation:

| Change | Required review |
| --- | --- |
| Add tags to the current profile | Existing slots remain stable; add visuals for new slots if required. |
| Select another profile | Slot meanings/counts can change; review filters, labels, calculations and missing columns. |
| Same tag name in different namespaces | Distinct slots remain separate; use `OAC_OCI_FOCUS_TAG_SLOT_V` for the namespace and label. |

## Updating the package

Re-export the workbook as DVA with **Include Data** and **Include Connection Credentials** off. Keep dataset metadata and the connection definition; each destination supplies its endpoint and credentials. See Oracle's [DVA export guidance](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/faqs-export-items-dva-format.html).
