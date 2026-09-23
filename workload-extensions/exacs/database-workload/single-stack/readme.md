# Cloud Exadata Database Workload — Single-stack UC1 <!-- omit from toc -->

Use this quickstart after the **ExaCS single-stack foundation** for UC1 has completed, including its required post-update and final re-apply. The foundation creates the compartments, IAM, network, routing, security, and observability prerequisites; do not supply its foundation JSON files as inputs to a database workload stage.

## Configuration files

| Stage | Configuration file | Exadata output input | Saved output and state |
| --- | --- | --- | --- |
| Infrastructure | `exacs_cloud_exadata_infrastructure.json` | None | `runtime/exacs/infrastructure/output/cloud_exadata_database_output.json`; `exacs-infrastructure.tfstate` |
| VM clusters | `exacs_cloud_exadata_vmclusters.json` | Only the infrastructure output | `runtime/exacs/vmclusters/output/cloud_exadata_database_output.json`; `exacs-vmclusters.tfstate` |
| Database objects | `exacs_cloud_exadata_databases.json` | Only the VM-cluster output | `runtime/exacs/databases/output/cloud_exadata_database_output.json`; `exacs-databases.tfstate` |

`exacs_cloud_exadata_databases.json` creates the DB Home, CDB, and PDB. Do not use both earlier `cloud_exadata_database_output.json` files in the VM-cluster or database stage.

## Review the copied package

Copy these JSON files to a customer-controlled private bucket or approved private Git repository. Before creating any plan, replace the secret OCID `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` and the SSH key `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY`. Also review the region, availability domain, shape, CPU capacity, Grid Infrastructure version, database version, and names.

## OCI Resource Manager

Create three Resource Manager stacks using the pinned Orchestrator source with working directory `rms-facade`. Set one `oci_configuration_objects` entry per stack in the order shown above. Save JSON output with a distinct `oci_object_prefix` for each stage. Add the matching foundation dependencies and exactly one upstream Exadata output:

1. Infrastructure: foundation compartments output and any required subscription output.
2. VM clusters: foundation compartments and network outputs, plus `runtime/exacs/infrastructure/output/cloud_exadata_database_output.json`.
3. Database objects: the applicable KMS or Recovery Service outputs only when their logical keys are used, plus `runtime/exacs/vmclusters/output/cloud_exadata_database_output.json`.

Review each plan with automatic apply disabled. Start the next stage only after the preceding resources are available and its output has been saved.

## Terraform CLI

Use a separate tfvars file and state for every row of the table. Set `configuration_source = "file"`, place only that row's JSON in `local_config_file_paths`, and save output to that row's distinct `output_folder_path`. Preserve infrastructure and VM-cluster outputs until every dependent stage has been destroyed.

For the complete customization flow, deployment variables, recovery guidance, and cleanup procedure, see [Blueprint Factory](../blueprint-factory.md).
