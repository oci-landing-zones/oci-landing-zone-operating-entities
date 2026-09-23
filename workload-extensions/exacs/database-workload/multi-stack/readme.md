# Cloud Exadata Database Workload — Multi-stack UC1 <!-- omit from toc -->

Use this quickstart after the **ExaCS multi-stack foundation** for UC1 has completed, including the required **hub post-update** and final network and observability re-apply. The foundation owns compartments, IAM, network, routing, security, and observability; do not include its foundation JSON files as database workload inputs.

## Configuration files

| Stage | Configuration file | Exadata output input | Saved output and state |
| --- | --- | --- | --- |
| Infrastructure | `exacs_cloud_exadata_infrastructure.json` | None | `runtime/exacs/infrastructure/output/cloud_exadata_database_output.json`; `exacs-infrastructure.tfstate` |
| VM clusters | `exacs_cloud_exadata_vmclusters.json` | Only the infrastructure output | `runtime/exacs/vmclusters/output/cloud_exadata_database_output.json`; `exacs-vmclusters.tfstate` |
| Database objects | `exacs_cloud_exadata_databases.json` | Only the VM-cluster output | `runtime/exacs/databases/output/cloud_exadata_database_output.json`; `exacs-databases.tfstate` |

`exacs_cloud_exadata_databases.json` creates the DB Home, CDB, and PDB. Each row is an independent Orchestrator state because the three documents repeat the same `cloud_exadata_database_configuration` root. The single-stack path avoids that collision by publishing one combined document instead.

## Review the copied package

Stage these JSON files in a customer-controlled private bucket or approved private Git repository. Before a plan, replace `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` and `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY`. Review the region, availability domain, Exadata shape, CPU capacity, Grid Infrastructure version, database version, and resource names against the target tenancy.

## OCI Resource Manager

Create three Resource Manager stacks from the pinned Orchestrator source with working directory `rms-facade`. Each stack receives exactly one `oci_configuration_objects` JSON. Use a different `oci_object_prefix` for infrastructure, VM clusters, and database objects.

1. Infrastructure consumes the required foundation compartments output and any required subscription output.
2. VM clusters consumes foundation compartments and network outputs plus only `runtime/exacs/infrastructure/output/cloud_exadata_database_output.json`.
3. Database objects consumes only `runtime/exacs/vmclusters/output/cloud_exadata_database_output.json` as its Exadata dependency, plus optional KMS or Recovery Service outputs when logical keys require them.

Do not include both earlier Exadata outputs in a downstream stack. Review a saved plan and verify stage availability before applying the next stack.

## Terraform CLI

Use one tfvars file, Terraform state, and output directory per stage. Set `configuration_source = "file"`; put only the relevant JSON in `local_config_file_paths`; and pass only the stage's foundation dependencies and immediate upstream Exadata output in `local_dependency_file_paths`.

For Blueprint Factory customization, detailed variable examples, post-deployment verification, recovery, and cleanup, see [Blueprint Factory](../blueprint-factory.md).
