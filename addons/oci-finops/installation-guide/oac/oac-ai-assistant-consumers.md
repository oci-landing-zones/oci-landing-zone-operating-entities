# Configure AI Assistant for OAC workbook consumers

Enable dataset indexing and the workbook's Assistant panel after [workbook import](oac-workbook-import.md) and [consumer access setup](oac-user-onboarding.md). These OAC settings are separate from the database installer.

## Contents

- [Prerequisites](#prerequisites)
- [Configure dataset indexing](#configure-dataset-indexing)
- [Enable the consumer presentation](#enable-the-consumer-presentation)
- [Verify from a consumer account](#verify-from-a-consumer-account)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- An OAC administrator has configured the generative AI source for Workbook Assistant and confirmed feature availability for the target service.
- The content administrator can edit the relevant datasets and workbook presentation.
- The intended consumer has **Use Assistant in Workbooks** and access to the workbook, datasets and connection.
- The published database source is ready and the workbook can query it.

See Oracle's [Assistant setup prerequisites](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/oracle-analytics-ai-assistant.html). Enabling the panel does not grant consumer permissions.

## Configure dataset indexing

1. On Home or Data, open the dataset's **Actions → Inspect → Search → Settings**.
2. Select **Assistants** under **Index Dataset For**; include Homepage Search only if that experience is also required.
3. Choose the index language and update schedule.
4. Under **Scope**, select the columns needed for the intended questions. Use **Name** for field metadata or **Name and values** when data values must be searchable. Review the Sensitive Data setting for the intended audience.
5. Add useful column synonyms, then save.
6. Run indexing with **Run Now** and inspect the last execution with **Check Now** before continuing.

Repeat for each dataset the Assistant will use. Changing indexing on a dataset affects that shared dataset, not only the current workbook. See Oracle's [dataset indexing procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/index-dataset.html).

For tag questions, resolve the published `TAG_n` meanings through the [tag-slot contract](../../design/03-oac-oci-focus-cost-detail.md#published-tag-labels), then index the corresponding dataset fields and their useful values. Reindex after changing scope or synonyms.

## Enable the consumer presentation

1. Open the workbook for editing.
2. Select **Preview → Configure Presentation → Workbook**.
3. Enable **Insights Panel** and **Workbook Assistant**.
4. Select the datasets or subject areas available to the Assistant.
5. Optionally enable **Open by Default**, then save.

See Oracle's [Insights Panel configuration](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/specify-insights-panel-options-consumers.html). Configure only the data sources intended for this audience.

## Verify from a consumer account

1. Open the saved workbook in View mode using an intended consumer's own account.
2. Open **Auto Insights → Assistant** and confirm the panel is available.
3. Ask a simple question specifying a measure, period, currency and grouping that exist in the dataset.
4. Compare the result against the workbook or underlying source with the same filters. Check the actual grouped fields and tag-slot meanings.
5. Start a fresh conversation when checking an independent question, so earlier context does not affect the comparison.

Confirm that the workflow uses the consumer's approved access and does not require the owner's session or database password.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Assistant unavailable in View mode | Generative AI configuration, consumer permission and saved presentation settings. |
| Dataset unavailable to the Assistant | Indexing enabled, successful last execution and dataset selected in the workbook presentation. |
| A tag or value is not recognized | Published slot mapping, index scope, indexed values and synonyms. |
| Results use an unexpected grouping or filter | Requested fields and conversational context; repeat with a fresh conversation. |
| A consumer cannot access the data | Workbook, dataset and connection permissions in the [onboarding guide](oac-user-onboarding.md). |
