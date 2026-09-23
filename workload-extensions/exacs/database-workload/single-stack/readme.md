# Cloud Exadata Database Workload — Single-stack UC1 <!-- omit from toc -->

This is a real single-stack quickstart. Deploy the **ExaCS single-stack foundation** JSON package and this workload JSON in the same Orchestrator operation. The operation creates the landing-zone foundation, Cloud Exadata Infrastructure, Cloud VM Cluster, DB Home, CDB, and PDB together.

## Configuration file

Add this file to the existing ExaCS single-stack foundation configuration package:

| Configuration file | Contents |
| --- | --- |
| `exacs_cloud_exadata_database.json` | One `cloud_exadata_database_configuration` root with Cloud Exadata Infrastructure, Cloud VM Cluster, DB Home, CDB, and PDB sections. |

Use **one Resource Manager stack** or **one Terraform state** for the foundation JSON files and `exacs_cloud_exadata_database.json`. Do not add the three multi-stack workload files: their repeated Cloud Exadata root would be ignored rather than merged by Orchestrator.

## Review the copied package

Copy the foundation package and this workload JSON to a customer-controlled private bucket or approved private Git repository. Before creating a plan, replace the secret OCID `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` and the SSH key `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY`. Review the region, availability domain, Exadata shape, CPU capacity, Grid Infrastructure version, database version, display names, and database names.

## OCI Resource Manager

Create one Resource Manager stack from the pinned Orchestrator source with working directory `rms-facade`. Include all of the matching ExaCS single-stack foundation JSON files and exactly one workload configuration object, `exacs_cloud_exadata_database.json`. Use one output prefix for the operation and review its plan with automatic apply disabled.

There is no intermediate `cloud_exadata_database_output.json` dependency in this path. Every Cloud Exadata section is present in the same root document and is handled by the same stack state. If the foundation requires its final observability re-apply, retain `exacs_cloud_exadata_database.json` unchanged in that same stack configuration set; replacing it with a foundation-only file list would plan removal of the database resources.

## Terraform CLI

Use one tfvars file and one Terraform state. Set `configuration_source = "file"`; include the full ExaCS single-stack foundation JSON set and `exacs_cloud_exadata_database.json` in `local_config_file_paths`; and provide the foundation dependencies required by those files. Do not split the workload into separate tfvars files or states.

For Blueprint Factory customization, detailed variable examples, post-deployment verification, recovery, and cleanup, see [Blueprint Factory](../blueprint-factory.md).
