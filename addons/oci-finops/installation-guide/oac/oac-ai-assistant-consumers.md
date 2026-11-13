# Configure AI Assistant for OAC workbook consumers

Enable the Assistant after [workbook import](oac-workbook-import.md) and [consumer access setup](oac-user-onboarding.md). These settings are separate from the database installer.

## Contents

- [Prerequisites](#prerequisites)
- [Configure dataset indexing](#configure-dataset-indexing)
- [Enable the consumer presentation](#enable-the-consumer-presentation)
- [Verify from a consumer account](#verify-from-a-consumer-account)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- The OAC administrator has configured the generative AI source and confirmed Workbook Assistant availability.
- A content administrator can edit the workbook presentation and relevant datasets.
- The consumer has **Use Assistant in Workbooks** plus access to the workbook, datasets and connection.
- The published database source is ready and ordinary workbook queries work.

See Oracle's [Assistant prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/oracle-analytics-ai-assistant.html).

## Configure dataset indexing

For each dataset the Assistant will use:

1. Open **Actions → Inspect → Search → Settings** and select **Assistants** under **Index Dataset For**. Homepage Search is optional.
2. Set the language, update schedule and column scope. Choose **Name** for field metadata or **Name and values** to search values; review the **Sensitive Data** setting and add useful synonyms.
3. Save, select **Run Now**, then use **Check Now** to confirm indexing succeeded.

Index only the intended columns. Settings affect the shared dataset, not just this workbook. For tag questions, resolve `TAG_n` meanings through the [published slot mapping](../../design/03-oac-oci-focus-cost-detail.md#published-tag-labels) before choosing columns/values. Reindex after scope or synonym changes. See Oracle's [indexing procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/index-dataset.html).

## Enable the consumer presentation

1. Edit the workbook and open **Preview → Configure Presentation → Workbook**.
2. Enable **Insights Panel** and **Workbook Assistant**; select the datasets or subject areas approved for this audience.
3. Optionally enable **Open by Default**, then save.

The panel does not grant data access. See Oracle's [Insights Panel settings](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/specify-insights-panel-options-consumers.html).

## Verify from a consumer account

1. Open the saved workbook in **View** mode with an intended consumer's own account.
2. Open **Auto Insights → Assistant** and ask a question using a measure, period, currency and grouping available in the dataset.
3. Compare the result with the workbook using identical filters, including the correct tag-slot meanings. Use a fresh conversation for an independent question.

Confirm no owner's session or database password is needed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Assistant missing | AI-source configuration, consumer permission and saved presentation settings. |
| Dataset missing | Assistant indexing enabled/successful and dataset selected in presentation. |
| Tag/value unrecognized | Slot mapping, index scope/values and synonyms. |
| Unexpected grouping/filter | Requested fields and conversation context; retry in a fresh conversation. |
| Data inaccessible | [Workbook, dataset and connection permissions](oac-user-onboarding.md). |
