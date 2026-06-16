# OCI Groups and Policies defitions for Project Approach

This document defines three OCI IAM groups for an OCI Base Database monitored with Log Analytics, Ops Insights, and Database Management in a specific compartment `<compartment_name>`. 

## Placeholders

Replace these values before creating the policies:

- `<compartment_name>`: OCI compartment name. If nested, use the chained name, for example `parent_compartment:<compartment_name>`.
- `<compartment_ocid>`: OCID of the compartment containing the Management Agent resources.
- `<vault_ocid>`: OCID of the Vault that stores database credential secrets.
- `<secret_ocid>`: OCID of the database credential secret used by Database Management.
- `<identity_domain_name>`: optional identity domain prefix, if your groups are not in the default domain.
- `<vault_compartment_name>`: optional compartment name for Vault and secrets if they are stored outside `<compartment_name>`.

Recommended policy-safe group names:

- `Observability_Admin`
- `Observability_User`
- `Observability_Reader`

If you keep display names with spaces, such as `Observability admin`, adjust the policy subject syntax to match your OCI identity domain/group naming convention.

## Scope Notes

The policies below are intentionally compartment-scoped. The Log Analytics `loganalytics-features-family` resource family is not included because Oracle defines it as tenancy-level only, not compartment-level. If your tenancy already enabled Log Analytics through the onboarding wizard, those feature-level policies may already exist; do not duplicate them here.

## Role Descriptions

### Observability Admin

Full observability administrator for the compartment. This role can configure and maintain Log Analytics resources, Ops Insights, Database Management, dashboards, notification topics and subscriptions, Management Agents, agent install keys, named credentials, metrics, alarms, private endpoint networking dependencies, compute inventory required for agent visibility, and database credential secrets. It can use OCI database resources needed by the observability services, but it does not grant full database lifecycle administration.

### Observability User

Operational user for day-to-day observability work. This role can use Log Analytics, work with dashboards, view Ops Insights and Database Management data, inspect database resources, read metrics and alarms, and use notification topics and subscriptions for observability workflows. It is intended for operators who investigate performance and availability issues without managing service onboarding, private endpoints, agents, or secrets.

### Observability Reader

Read-only observability role. This role can view Log Analytics resources, dashboards, Ops Insights, Database Management information, Management Agents, metrics, alarms, notification topics and subscriptions, and database inventory metadata in the compartment. It should not create, update, delete, upload, ingest, or administer observability resources.

## Dynamic Group

Create a dynamic group for the Management Agents installed on the Base Database VM.

Dynamic group name:

```text
Observability_Management_Agents_DG
```

Matching rule:

```text
ALL {resource.type = 'managementagent', resource.compartment.id = '<compartment_ocid>'}
```

If your tenancy uses identity domains for dynamic groups, reference the dynamic group in policies as:

```text
<identity_domain_name>/Observability_Management_Agents_DG
```

## Policies

Create these policies at the compartment level for `<compartment_name>`.

### Observability Admin Policies

```text
Allow group Observability_Admin to manage loganalytics-resources-family in compartment <compartment_name>
Allow group Observability_Admin to manage management-dashboard-family in compartment <compartment_name>

Allow group Observability_Admin to manage opsi-family in compartment <compartment_name>
Allow group Observability_Admin to manage dbmgmt-family in compartment <compartment_name>

Allow group Observability_Admin to manage management-agents in compartment <compartment_name>
Allow group Observability_Admin to manage management-agent-install-keys in compartment <compartment_name>
Allow group Observability_Admin to manage management-agent-named-credentials in compartment <compartment_name>

Allow group Observability_Admin to inspect all-resources in compartment <compartment_name>
Allow group Observability_Admin to use database-family in compartment <compartment_name>
Allow group Observability_Admin to manage metrics in compartment <compartment_name>
Allow group Observability_Admin to manage alarms in compartment <compartment_name>
Allow group Observability_Admin to manage ons-family in compartment <compartment_name>

Allow group Observability_Admin to manage vnics in compartment <compartment_name>
Allow group Observability_Admin to use subnets in compartment <compartment_name>
Allow group Observability_Admin to manage network-security-groups in compartment <compartment_name>
Allow group Observability_Admin to use security-lists in compartment <compartment_name>
Allow group Observability_Admin to read virtual-network-family in compartment <compartment_name>

Allow group Observability_Admin to read vaults in compartment <compartment_name>
Allow group Observability_Admin to use keys in compartment <compartment_name>
Allow group Observability_Admin to manage secret-family in compartment <compartment_name>

Allow group Observability_Admin to read instance-family in compartment <compartment_name>
Allow group Observability_Admin to read instance-agent-plugins in compartment <compartment_name>
```

### Observability User Policies

```text
Allow group Observability_User to use loganalytics-resources-family in compartment <compartment_name>
Allow group Observability_User to use management-dashboard-family in compartment <compartment_name>

Allow group Observability_User to read opsi-family in compartment <compartment_name>
Allow group Observability_User to read dbmgmt-family in compartment <compartment_name>

Allow group Observability_User to read management-agents in compartment <compartment_name>
Allow group Observability_User to read management-agent-install-keys in compartment <compartment_name>

Allow group Observability_User to inspect database-family in compartment <compartment_name>
Allow group Observability_User to read metrics in compartment <compartment_name>
Allow group Observability_User to read alarms in compartment <compartment_name>
Allow group Observability_User to use ons-family in compartment <compartment_name>

Allow group Observability_User to read vaults in compartment <compartment_name>
Allow group Observability_User to read secret-family in compartment <compartment_name> where target.vault.id = '<vault_ocid>'
```

### Observability Reader Policies

```text
Allow group Observability_Reader to read loganalytics-resources-family in compartment <compartment_name>
Allow group Observability_Reader to read management-dashboard-family in compartment <compartment_name>

Allow group Observability_Reader to read opsi-family in compartment <compartment_name>
Allow group Observability_Reader to read dbmgmt-family in compartment <compartment_name>

Allow group Observability_Reader to read management-agents in compartment <compartment_name>
Allow group Observability_Reader to read management-agent-install-keys in compartment <compartment_name>

Allow group Observability_Reader to inspect database-family in compartment <compartment_name>
Allow group Observability_Reader to read metrics in compartment <compartment_name>
Allow group Observability_Reader to read alarms in compartment <compartment_name>
Allow group Observability_Reader to read ons-family in compartment <compartment_name>
```

### Log Analytics Ingestion Policies

These policies allow the Management Agent dynamic group to upload logs to Log Analytics and emit metrics.

```text
Allow dynamic-group Observability_Management_Agents_DG to use metrics in compartment <compartment_name>
Allow dynamic-group Observability_Management_Agents_DG to {LOG_ANALYTICS_LOG_GROUP_UPLOAD_LOGS} in compartment <compartment_name>
```

If the dynamic group is in a non-default identity domain, replace `Observability_Management_Agents_DG` with `<identity_domain_name>/Observability_Management_Agents_DG` in the two statements above.

### Service Policies From Supplied Baseline

The supplied baseline includes service policies for Ops Insights and Log Analytics. The compartment-scoped equivalents are:

```text
Allow service operations-insights to use ons-topics in compartment <compartment_name>
Allow service operations-insights to read secret-family in compartment <compartment_name>
Allow service loganalytics to use metrics in compartment <compartment_name>
```

If Autonomous Database monitoring is in scope, also include:

```text
Allow group Observability_Admin to use autonomous-database-family in compartment <compartment_name>
Allow service operations-insights to read autonomous-database-family in compartment <compartment_name> where ALL {request.operation = 'GenerateAutonomousDatabaseWallet'}
```

If your landing zone requires the `dpd` service to read Vault secrets in a separate security compartment, include:

```text
Allow service dpd to read secret-family in compartment <vault_compartment_name>
```

### Management Dashboard And Notifications

Management Dashboard policies are included in each role block through `management-dashboard-family`, which covers dashboards and saved searches. Notification policies are included through `ons-family`, which covers notification topics and subscriptions.

The supplied baseline also contains individual `management-dashboard` and `management-saved-search` statements. Those are not repeated here because `management-dashboard-family` already covers both resource types.

### Vault And Secret Access For Private Endpoint Monitoring

These policies allow Ops Insights and Database Management to read database credential secrets from Vault.

```text
Allow any-user to read secret-family in compartment <compartment_name> where ALL {request.principal.type = 'opsidatabaseinsight', target.vault.id = '<vault_ocid>'}

Allow any-user to read secret-family in compartment <compartment_name> where ALL {request.principal.type = 'dbmgmtmanageddatabase', target.secret.id = '<secret_ocid>'}
```

For multiple Database Management credential secrets, create one Database Management service access statement per secret OCID.

## Notes

- These policy statements are written with compartment scope and avoid `in tenancy`.
- `loganalytics-features-family` is excluded from the policy blocks because it is not compartment-scoped.
- The supplied baseline includes `loganalytics-features-family`, `loganalytics-ingesttime-rule`, `read users`, and `read compartments` statements that are tenancy/root-level or global administration policies in the supplied configuration. They are not included in the main compartment policy blocks.
- `dbmgmt-family` already covers `dbmgmt-private-endpoints` and `dbmgmt-work-requests`.
- `ons-family` covers notification topics and subscriptions. The supplied baseline's individual topic policy is therefore covered by the aggregate family policy above.
- If the Vault is in a different compartment from the database and observability resources, create the Vault and secret policies in the Vault compartment instead.
- If private endpoints are already created and Observability Admins do not need to maintain them, you can omit the VNIC, subnet, network security group, and security list statements.
