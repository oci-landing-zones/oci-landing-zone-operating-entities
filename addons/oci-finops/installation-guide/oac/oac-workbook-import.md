# Import the FOCUSPLATFORM OAC workbook

This guide explains how to import the complete Oracle Analytics Cloud (OAC) workbook into another OAC instance and connect it to that deployment's `FOCUSPLATFORM` schema.

## Contents

- [Package contents and prerequisites](#package-contents-and-prerequisites)
- [Import steps](#import-steps)
- [Acceptance checks](#acceptance-checks)
- [Check the database reader if connection access fails](#check-the-database-reader-if-connection-access-fails)
- [After reporting profile changes](#after-reporting-profile-changes)
- [Updating the package](#updating-the-package)
- [Oracle references](#oracle-references)

## Package contents and prerequisites

The repository package is [`installation-guide/oac/export/FOCUSPLATFORM_OAC_FINOPS_DASHBOARDS.dva`](export/FOCUSPLATFORM_OAC_FINOPS_DASHBOARDS.dva). It contains the complete eight-canvas workbook, 41 visualizations, and their dependent dataset definitions. **Include Data** and **Include Connection Credentials** are off: the package has no cost-data snapshot or saved database credentials, and it does not require an import password. The included connection is named `conn_focus_prd_adb`; configure it for the destination ADB after import.

Before importing, confirm:

- The destination is Oracle Analytics Cloud at the same update level as the source or a later update. Oracle does not recommend importing a workbook exported from a newer update into an older OAC update.
- The destination OAC has network access to the target Autonomous Database.
- The FOCUSPLATFORM database installation is complete, including the OCI landing, an active tag profile, the OAC cost-detail module, and the OCI Cloud Advisor module.
- The database account used by OAC can query `FOCUSPLATFORM.OAC_OCI_FOCUS_COST_DETAIL`, `FOCUSPLATFORM.OAC_OCI_FOCUS_TAG_SLOT_V`, `FOCUSPLATFORM.OCI_ADVISOR_ACTIONS_V`, `FOCUSPLATFORM.OCI_ADVISOR_RECOMMENDATIONS_V`, and `FOCUSPLATFORM.OCI_ADVISOR_SYNC_RUN`.
- The importing OAC user has permission to import workbooks and create or use the required database connection.

The cost datasets use the stable database synonym `OAC_OCI_FOCUS_COST_DETAIL`; the synonym points to the currently published, versioned materialized view. This workbook is configured for the six generic slots `TAG_1` through `TAG_6`. Their meanings are available from `OAC_OCI_FOCUS_TAG_SLOT_V` and can change when the selected tag profile is replaced; workbook headings remain generic so a different tag name does not break a chart. A destination with fewer than six published slots must remove the charts and formulas for absent slots. A destination with more than six slots can use the workbook for its first six slots; additional slot visualizations require workbook edits. The Advisor dataset uses the destination OCI provider's current action and recommendation views.

## Import steps

1. Sign in to the destination OAC.
2. Open **Home → Page Menu → Import Workbook/Flow**.
3. Select `FOCUSPLATFORM_OAC_FINOPS_DASHBOARDS.dva` and choose **Import**. The package has no password-protected data or credentials, so no package password is expected.
4. Wait for **Import Successful**, then open the imported workbook.
5. Confirm that all eight canvases are present: **Overview**, **Month-To-Date Comparison**, **Details by TAG_4**, **Tag Analysis**, **Forecast**, **Advisor**, **Anomalies**, and **Cost Detail**.
6. In OAC **Navigator → Data → Connections**, open the imported connection's **Actions → Inspect** page and configure `conn_focus_prd_adb` for the destination ADB and its approved [reporting account](../../design/00-schema-bootstrap.md#created-objects-and-access). Test and save the connection. Do not reuse the source environment's credentials. The Console's semantic-model database-connection administration is a different connection surface.
7. In the workbook, refresh dataset metadata and workbook data. If OAC reports a missing connection, select the configured `conn_focus_prd_adb` connection for the affected datasets; keep the `FOCUSPLATFORM` schema and the dataset column names unchanged.
8. Check that cost rows load, `TAG_1`…`TAG_6` are available, and the Advisor canvas returns rows from the destination's OCI Advisor module.
9. For team use, save the workbook in the approved **Shared Folders** team folder and verify every dependent dataset and connection. Follow the [OAC user onboarding runbook](oac-user-onboarding.md) for the exact identity, role, catalog access, and viewer acceptance steps. A workbook and datasets in Shared Folders can still fail with HTTP 403 if `conn_focus_prd_adb` remains private in **My Folders**.

Importing from the OAC home page places the workbook and included dependent artifacts in the importing user's **My Folders**. To import into a shared catalog folder, select that folder in Catalog before importing. Avoid importing over an existing workbook unless replacement is intended.

Import success is not consumer-access acceptance. Confirm the actual location and access list of the connection after import, even if the workbook and datasets were moved to a shared folder. New viewers normally reuse that connection; do not create one connection per viewer when saved credentials are the intended authentication mode.

## Acceptance checks

- All eight canvases open without missing-dataset or connection errors.
- The service-cost visualization returns rows from the destination database.
- The cost summary value agrees with a query against the destination synonym using the same reporting filters.
- The tag page shows `TAG_1` through `TAG_6`; use `OAC_OCI_FOCUS_TAG_SLOT_V` to confirm each slot's current namespace and tag label.
- The Advisor page returns data from the destination `FOCUSPLATFORM` views.
- No data extract or credentials were imported from the package; results are live queries to the destination ADB.

Check tag coverage and cost aggregation against destination data before production use; distinguish missing tag values from missing data or an incorrect slot mapping.

## Check the database reader if connection access fails

Module 00 already creates and authorizes `OAC_FOCUS_READER`; a fresh installation needs no additional reader-grant step. Check that the OAC connection uses that account and targets the intended ADB. Once the cost-detail source exists, test the connection with:

```sql
SELECT COUNT(*) FROM FOCUSPLATFORM.OAC_OCI_FOCUS_COST_DETAIL;
```

If database authorization fails, have the database administrator compare the installed reader grants with the [schema access contract](../../design/00-schema-bootstrap.md#created-objects-and-access) and run the existing [reader grant verifier/repair script](../../deployment/sql/install/00_schema/01_grant_oac_reader_access.sql) when appropriate. Catalog HTTP 403 errors are a separate OAC access check covered by the user-onboarding guide.

## After reporting profile changes

Apply the profile, build and explicitly publish its validated candidate using the [database procedure](../adb/manual-sql-installation.md#change-a-profile-and-publish-an-mv-candidate). Then align workbook metadata and presentation with the published column contract:

| Profile change | MV column contract | OAC effect |
| --- | --- | --- |
| Add tags to the active profile | Existing `TAG_n` assignments keep their slot numbers; new tags append slots and columns. | Existing field bindings remain valid. Refresh dataset metadata and add visuals for new slots if needed. |
| Select a different profile name | A new candidate follows that profile's highest reserved slot. A slot can represent a different tag. | Refresh dataset metadata if the number of slots changes; review filters, titles, and calculations because slot meanings can change. |
| Select tags with the same tag name in different namespaces | Each profile item retains its namespace ID and a distinct slot; the MV reads `<namespace>.<tag>` from JSON. | `TAG_n` names do not collide. Use `OAC_OCI_FOCUS_TAG_SLOT_V` to display the published namespace and tag label. |

## Updating the package

When the workbook changes, export it again from OAC as a `.dva` package. Keep **Include Data** and **Include Connection Credentials** off for a deployment template. The package contains dataset metadata and a connection definition, but each destination must configure its own ADB endpoint and credentials.

## Oracle references

- [Import and Export Workbooks in Oracle Analytics](https://docs.oracle.com/en/cloud/paas/analytics-cloud/tutorial-import-export-projects/)
- [Import a Workbook File](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/import-workbook-file.html)
- [FAQs: Export Items in DVA Format](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/faqs-export-items-dva-format.html)
