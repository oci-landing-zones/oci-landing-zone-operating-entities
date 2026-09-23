# Cloud Exadata Database Workload — Blueprint Factory <!-- omit from toc -->

For the published UC1 quickstarts, start at the [workload overview](readme.md). This guide is the customization path for Blueprint Factory configurations.

- [**1. Summary**](#1-summary)
- [**2. Scope and prerequisites**](#2-scope-and-prerequisites)
- [**3. Configure the workload in Blueprint Factory**](#3-configure-the-workload-in-blueprint-factory)
  - [Common workload definition](#common-workload-definition)
  - [UC1: shared infrastructure and shared VM cluster](#uc1-shared-infrastructure-and-shared-vm-cluster)
  - [UC2: shared infrastructure and environment VM cluster](#uc2-shared-infrastructure-and-environment-vm-cluster)
  - [UC3: environment infrastructure and VM cluster](#uc3-environment-infrastructure-and-vm-cluster)
- [**4. Generate and review the configuration files**](#4-generate-and-review-the-configuration-files)
- [**5. Deployment contract**](#5-deployment-contract)
- [**6. Deploy with OCI Resource Manager**](#6-deploy-with-oci-resource-manager)
- [**7. Deploy with Terraform CLI**](#7-deploy-with-terraform-cli)
- [**8. Post-deployment verification and recovery**](#8-post-deployment-verification-and-recovery)
- [**9. Cleanup**](#9-cleanup)
- [**10. Support boundaries and troubleshooting**](#10-support-boundaries-and-troubleshooting)

## **1. Summary**

| | |
| --- | --- |
| **NAME** | Cloud Exadata Database workload deployment |
| **OBJECTIVE** | Create Cloud Exadata Infrastructure, Cloud VM Clusters, DB Homes, CDBs, and PDBs after the ExaDB-D Landing Zone prerequisites exist. |
| **TARGET RESOURCES** | Cloud Exadata Infrastructure, Cloud VM Clusters, DB Homes, CDBs, and PDBs. |
| **DEPLOYMENT** | Generate the configuration with Blueprint Factory, then deploy three ordered and independently stateful stacks through OCI Resource Manager or Terraform CLI. |

This guide covers the database workload layer only. Complete the selected [ExaDB-D extension](../readme.md) single-stack or multi-stack flow first; that flow owns the Landing Zone compartments, IAM, networking, routing, security, and observability prerequisites.

Use the official OCI Landing Zone Orchestrator [`release-2.1.4`](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/release-2.1.4). The contract in this guide was validated against commit [`a875689d7add06eed2cfac33f7187d1c7228c348`](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/a875689d7add06eed2cfac33f7187d1c7228c348). Pin that commit for a reproducible deployment and revalidate before changing the pin.

## **2. Scope and prerequisites**

Before generating or deploying the workload:

- Complete the selected ExaDB-D single-stack or multi-stack deployment, including its required hub post-update and final network/observability re-apply.
- Keep the applicable foundation outputs available. The stage matrix in [Deployment contract](#5-deployment-contract) identifies which outputs each stack consumes.
- Install a Jsonnet renderer on `PATH` and decide where the reviewed source configuration and generated output directory will live.
- Use Terraform 1.5.0 or later. OCI Resource Manager must use the Orchestrator `rms-facade` working directory.
- Confirm that the tenancy has the required Exadata capacity, service limits, IAM permissions, supported shape, database versions, and network connectivity for the target region and availability domain.
- Provide direct Vault secret OCIDs for required `*_secret_id` values such as `admin_password_secret_id`. Orchestrator 2.1.4 does not expose `secrets_dependency` for logical secret-key resolution.
- Back up any data that must be retained before changing or destroying database resources.

OCI Resource Manager with configurations in a customer-controlled private Object Storage bucket is the recommended delivery path. Terraform CLI, customer-controlled CI/CD, and an approved private Git source remain supported alternatives. Do not use public raw URLs or a public bucket as the production source.

## **3. Configure the workload in Blueprint Factory**

The workload is opt-in through `extension.params.exacs_database_workload`. It supports regular Exadata Database Service on Dedicated Infrastructure using Cloud VM Clusters.

The examples below use Jsonnet composition to keep the resource definition identical across the three supported placement patterns. Put the common definition and exactly one UC expression in the same `.jsonnet` file, then replace the example region, CIDRs, email addresses, names, versions, SSH key, and secret OCID with reviewed deployment values.

### Common workload definition <!-- omit from toc -->

```jsonnet
local notification_emails = {
  default: ['exacs-platform@example.com'],
  db_workloads: ['exacs-db@example.com'],
  infra_workloads: ['exacs-infra@example.com'],
  projects: ['exacs-projects@example.com'],
};

local infrastructure_workload = {
  infrastructure: {
    cloud_exadata_infrastructures: {
      infra_primary: {
        display_name: 'exacs-infra-primary',
        shape: 'Exadata.X11M',
      },
    },
  },
};

local database_workload = {
  vmclusters: {
    cloud_vm_clusters: {
      vmc_primary: {
        display_name: 'exacs-vmc-primary',
        cpu_core_count: 2,
        exadata_infrastructure_id: 'infra_primary',
        gi_version: '19.0.0.0',
        hostname: 'exacsvmc',
        ssh_public_keys: ['ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY'],
      },
    },
  },
  databases: {
    cloud_db_homes: {
      dbhome_primary: {
        db_version: '19.0.0.0',
        display_name: 'exacs-dbhome-primary',
        source: 'VM_CLUSTER_NEW',
        vm_cluster_id: 'vmc_primary',
      },
    },
    databases: {
      cdb_primary: {
        database: {
          admin_password_secret_id: 'ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID',
          db_name: 'CDBPRIM',
        },
        db_home_id: 'dbhome_primary',
        source: 'NONE',
      },
    },
    pluggable_databases: {
      pdb_primary: {
        container_database_id: 'cdb_primary',
        pdb_name: 'PDBPRIMARY',
      },
    },
  },
};

local extension(workload) = {
  extension: {
    type: 'exacs',
    params: {
      notification_emails: notification_emails,
      exacs_database_workload: workload,
    },
  },
};

local base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
};
```

### UC1: shared infrastructure and shared VM cluster <!-- omit from toc -->

Use one shared, networked ExaCS platform for the infrastructure, VM cluster, and database objects:

```jsonnet
base + {
  shared_platforms: {
    exacs: extension(infrastructure_workload + database_workload) + {
      network: { vcn: '10.0.24.0/21' },
    },
  },
}
```

### UC2: shared infrastructure and environment VM cluster <!-- omit from toc -->

Keep the shared platform infrastructure-only and place the networked VM cluster and database objects in the selected environment:

```jsonnet
base + {
  shared_platforms: {
    exacs: extension(infrastructure_workload),
  },
  environments+: {
    prod+: {
      platforms: {
        exacs: extension(database_workload) + {
          network: { vcn: '10.0.24.0/21' },
        },
      },
    },
  },
}
```

### UC3: environment infrastructure and VM cluster <!-- omit from toc -->

Place the infrastructure, VM cluster, and database objects together in a networked environment platform. Repeat the environment platform with unique resource keys and a non-overlapping VCN for each additional environment:

```jsonnet
base + {
  environments+: {
    prod+: {
      platforms: {
        exacs: extension(infrastructure_workload + database_workload) + {
          network: { vcn: '10.0.24.0/21' },
        },
      },
    },
  },
}
```

The generator supplies the ExaCS platform compartment and, for VM clusters, the managed `db` and `backup` subnet logical keys. Logical resource keys must be unique within each resource type across every selected ExaCS scope; duplicate keys are rejected instead of silently replacing an earlier scope.

## **4. Generate and review the configuration files**

From the root of this repository, generate into a separate working directory:

```bash
bash gen/generate.sh --config path/to/exacs.jsonnet generated/exacs
```

Review the complete generated working set. Do not mix it with published JSON snapshots under `blueprints/` or `workload-extensions/`.

The database workload emits one file for each configured operation section:

| Configured input | Generated file | Orchestrator root | Configuration section |
| --- | --- | --- | --- |
| `infrastructure` | `exacs_cloud_exadata_infrastructure.json` | `cloud_exadata_database_configuration` | `cloud_exadata_infrastructures_configuration.cloud_exadata_infrastructures` |
| `vmclusters` | `exacs_cloud_exadata_vmclusters.json` | `cloud_exadata_database_configuration` | `cloud_vm_clusters_configuration` |
| `databases` | `exacs_cloud_exadata_databases.json` | `cloud_exadata_database_configuration` | `cloud_db_homes_configuration`, `databases_configuration`, and `pluggable_databases_configuration` |

A configuration that declares only infrastructure emits only the infrastructure file. A full regular ExaDB-D deployment emits all three files and uses the three stages below.

Before deployment, parse the generated files and scan for example values that must be replaced:

```bash
jq empty generated/exacs/exacs_cloud_exadata_infrastructure.json
jq empty generated/exacs/exacs_cloud_exadata_vmclusters.json
jq empty generated/exacs/exacs_cloud_exadata_databases.json
rg -n 'REPLACE_WITH|example\.com' generated/exacs
```

## **5. Deployment contract**

All three files have the same `cloud_exadata_database_configuration` root. They are separate state boundaries and must not be supplied together in one Orchestrator operation or rely on an implicit deep merge.

Do not confuse the Landing Zone extension's single-stack option with a single state for these database resources. In Orchestrator 2.1.4, `rms-facade` keeps the first document found for a repeated top-level root; it does not deep-merge the nested Exadata sections. Consequently, one workload stack cannot consume the three generated files together. A true single-state database workload would require one combined configuration document containing every Exadata section; Blueprint Factory does not emit that alternative in this release.

| Stage | Configuration file | Persistent foundation dependencies | Exadata dependency | Isolated output location example | State example |
| --- | --- | --- | --- | --- | --- |
| Infrastructure | `exacs_cloud_exadata_infrastructure.json` | `compartments_output.json`; subscription dependency when a logical subscription key is used | None | `exacs/infrastructure/output/cloud_exadata_database_output.json` | `exacs-infrastructure.tfstate` |
| VM clusters | `exacs_cloud_exadata_vmclusters.json` | `compartments_output.json`, `network_output.json`; subscription dependency when used | Only the infrastructure-stage `cloud_exadata_database_output.json` | `exacs/vmclusters/output/cloud_exadata_database_output.json` | `exacs-vmclusters.tfstate` |
| Database objects | `exacs_cloud_exadata_databases.json` | `keys_output.json` and `autonomous_recovery_service_output.json` only when their logical keys are used | Only the VM-cluster-stage `cloud_exadata_database_output.json` | `exacs/databases/output/cloud_exadata_database_output.json` | `exacs-databases.tfstate` |

“Only” in the Exadata dependency column applies to Exadata output files. Continue to provide every applicable foundation dependency shown in the same row.

Each `cloud_exadata_database_output.json` is stage-local, not cumulative. Use a distinct output prefix or local output directory for every stage because the filename is identical. Preserve the infrastructure and VM-cluster outputs until all downstream resources have been destroyed.

## **6. Deploy with OCI Resource Manager**

Use the pinned Orchestrator source with `rms-facade` as the stack working directory. Stage the generated configuration files and dependency outputs in a customer-controlled private Object Storage bucket.

Create three Resource Manager stacks in this order: infrastructure, VM clusters, and database objects. Use these variables for the recommended Object Storage path:

| Variable | Infrastructure stack | VM-cluster stack | Database-object stack |
| --- | --- | --- | --- |
| `configuration_source` | `ocibucket` | `ocibucket` | `ocibucket` |
| `oci_configuration_bucket` | Customer private bucket | Same controlled bucket | Same controlled bucket |
| `oci_configuration_objects` | `exacs/config/exacs_cloud_exadata_infrastructure.json` | `exacs/config/exacs_cloud_exadata_vmclusters.json` | `exacs/config/exacs_cloud_exadata_databases.json` |
| `oci_dependency_objects` | Foundation dependencies for stage 1 | Foundation dependencies plus `exacs/infrastructure/output/cloud_exadata_database_output.json` | Optional foundation dependencies plus `exacs/vmclusters/output/cloud_exadata_database_output.json` |
| `save_output` | `true` | `true` | `true` |
| `output_format` | `json` | `json` | `json` |
| `oci_object_prefix` | `exacs/infrastructure/output` | `exacs/vmclusters/output` | `exacs/databases/output` |

For every stack:

1. Select the pinned Orchestrator source and set the working directory to `rms-facade`.
2. Configure exactly one `oci_configuration_objects` entry from the table.
3. Add only the dependencies required by that stage. Do not add both earlier Exadata outputs to a downstream stack.
4. Create and review a plan with automatic apply disabled.
5. Stop if the plan removes or replaces resources owned by another stage.
6. Apply only after the preceding stage is available and its output exists at the expected prefix.

For an approved private Git source, use `configuration_source = "github"`, `github_configuration_repo`, `github_configuration_branch`, `github_configuration_files`, `github_dependency_files`, and a distinct `github_file_prefix` per stage. A private Git source requires a token with read access and, when `save_output = true`, write access. The Object Storage path does not require a Git token.

Never replace an earlier stack's configuration file with a later-stage file. Removing the configuration owned by that state would make Terraform plan the removal of its resources.

## **7. Deploy with Terraform CLI**

Clone and pin the validated Orchestrator source, then initialize `rms-facade`:

```bash
git clone https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator.git
cd terraform-oci-modules-orchestrator
git checkout a875689d7add06eed2cfac33f7187d1c7228c348
cd rms-facade
terraform init
terraform validate
```

Use absolute paths in three separate `.tfvars` files. Configure OCI authentication through an approved local or CI/CD mechanism; do not commit credentials. Create the independent output directories before planning:

```bash
mkdir -p /absolute/runtime/exacs/infrastructure/output
mkdir -p /absolute/runtime/exacs/vmclusters/output
mkdir -p /absolute/runtime/exacs/databases/output
```

Infrastructure stage:

```hcl
configuration_source        = "file"
local_config_file_paths     = ["/absolute/generated/exacs/exacs_cloud_exadata_infrastructure.json"]
local_dependency_file_paths = ["/absolute/dependencies/compartments_output.json"]
save_output                 = true
output_format               = "json"
output_folder_path          = "/absolute/runtime/exacs/infrastructure/output"
```

VM-cluster stage:

```hcl
configuration_source    = "file"
local_config_file_paths = ["/absolute/generated/exacs/exacs_cloud_exadata_vmclusters.json"]
local_dependency_file_paths = [
  "/absolute/dependencies/compartments_output.json",
  "/absolute/dependencies/network_output.json",
  "/absolute/runtime/exacs/infrastructure/output/cloud_exadata_database_output.json",
]
save_output        = true
output_format      = "json"
output_folder_path = "/absolute/runtime/exacs/vmclusters/output"
```

Database-object stage:

```hcl
configuration_source    = "file"
local_config_file_paths = ["/absolute/generated/exacs/exacs_cloud_exadata_databases.json"]
local_dependency_file_paths = [
  "/absolute/runtime/exacs/vmclusters/output/cloud_exadata_database_output.json",
]
save_output        = true
output_format      = "json"
output_folder_path = "/absolute/runtime/exacs/databases/output"
```

Add optional subscription, KMS, or Recovery Service dependency files to the applicable stage as shown in the deployment matrix. Then create and apply one saved plan per state:

```bash
terraform plan -var-file=/absolute/runtime/exacs/infrastructure.tfvars -state=/absolute/runtime/exacs/exacs-infrastructure.tfstate -out=/absolute/runtime/exacs/exacs-infrastructure.plan
terraform apply -state=/absolute/runtime/exacs/exacs-infrastructure.tfstate /absolute/runtime/exacs/exacs-infrastructure.plan

terraform plan -var-file=/absolute/runtime/exacs/vmclusters.tfvars -state=/absolute/runtime/exacs/exacs-vmclusters.tfstate -out=/absolute/runtime/exacs/exacs-vmclusters.plan
terraform apply -state=/absolute/runtime/exacs/exacs-vmclusters.tfstate /absolute/runtime/exacs/exacs-vmclusters.plan

terraform plan -var-file=/absolute/runtime/exacs/databases.tfvars -state=/absolute/runtime/exacs/exacs-databases.tfstate -out=/absolute/runtime/exacs/exacs-databases.plan
terraform apply -state=/absolute/runtime/exacs/exacs-databases.tfstate /absolute/runtime/exacs/exacs-databases.plan
```

Run each pair only after the preceding stage has completed and its output has been reviewed. Workspaces are an alternative, but each stage must still have an independent state and output directory.

## **8. Post-deployment verification and recovery**

After each apply:

1. Confirm the expected resources reach an appropriate available state in OCI before starting the next stage.
2. Confirm that the stage wrote `cloud_exadata_database_output.json` to its isolated destination.
3. Review the output map before using it downstream:

   ```bash
   jq '.cloud_exadata_infrastructures' /absolute/runtime/exacs/infrastructure/output/cloud_exadata_database_output.json
   jq '.cloud_vm_clusters' /absolute/runtime/exacs/vmclusters/output/cloud_exadata_database_output.json
   jq '{database_homes, databases, pluggable_databases}' /absolute/runtime/exacs/databases/output/cloud_exadata_database_output.json
   ```

4. Run a fresh plan for the completed state and investigate unexpected drift before continuing.

If a stage fails, keep the preceding states, configurations, and output files unchanged. Correct the failing stage and rerun its plan against the same state. Do not move a later configuration into an earlier state, combine the Exadata output files, or recreate an upstream resource solely to retry a downstream stage.

## **9. Cleanup**

Destroy resources in reverse dependency order:

1. Database objects.
2. VM clusters.
3. Cloud Exadata Infrastructure.

Destroying database resources can permanently remove databases and data. Confirm backups, retention requirements, replication/failover state, and application shutdown before approving any destroy plan.

For Resource Manager, run and review a destroy plan on each of the three stacks in reverse order. Keep every original configuration and dependency object accessible until the dependent stack has been destroyed successfully.

For Terraform CLI, use the original `.tfvars` and state paths:

```bash
terraform plan -destroy -var-file=/absolute/runtime/exacs/databases.tfvars -state=/absolute/runtime/exacs/exacs-databases.tfstate -out=/absolute/runtime/exacs/exacs-databases-destroy.plan
terraform apply -state=/absolute/runtime/exacs/exacs-databases.tfstate /absolute/runtime/exacs/exacs-databases-destroy.plan

terraform plan -destroy -var-file=/absolute/runtime/exacs/vmclusters.tfvars -state=/absolute/runtime/exacs/exacs-vmclusters.tfstate -out=/absolute/runtime/exacs/exacs-vmclusters-destroy.plan
terraform apply -state=/absolute/runtime/exacs/exacs-vmclusters.tfstate /absolute/runtime/exacs/exacs-vmclusters-destroy.plan

terraform plan -destroy -var-file=/absolute/runtime/exacs/infrastructure.tfvars -state=/absolute/runtime/exacs/exacs-infrastructure.tfstate -out=/absolute/runtime/exacs/exacs-infrastructure-destroy.plan
terraform apply -state=/absolute/runtime/exacs/exacs-infrastructure.tfstate /absolute/runtime/exacs/exacs-infrastructure-destroy.plan
```

Stop if a destroy plan includes resources outside its stage or if the next upstream stage still has live dependents.

## **10. Support boundaries and troubleshooting**

Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are outside this generated contract. **Manual post-deployment configuration required** for those resources; the workload owner is responsible for their lifecycle, drift management, and compliance review.

| Symptom | Check |
| --- | --- |
| A VM cluster cannot resolve its Exadata infrastructure | Ensure the infrastructure stack completed, its isolated output is listed with the persistent foundation dependencies, and `exadata_infrastructure_id` uses the expected logical key. |
| A DB Home, CDB, or PDB cannot resolve an upstream resource | Supply the VM-cluster stack's isolated output as the only Exadata dependency; do not replace it with the infrastructure output. |
| A later stage plans to destroy resources from an earlier stage | Stop and verify that each stage uses a distinct Resource Manager stack or Terraform CLI state. Never replace an earlier stage's configuration in the same state. |
| A generated workload file is ignored or resources are missing | Check that only one Cloud Exadata configuration file is supplied to the stack and that the corresponding operation was present in the Blueprint Factory input. |
| An output was overwritten | Assign a distinct `oci_object_prefix`, `github_file_prefix`, or `output_folder_path` to every stage, then restore the correct upstream output before planning downstream. |
| A duplicate logical-key error is returned | Rename one resource key within its operation section. Keys must be unique across all selected ExaCS scopes. |
| Database password validation fails | Define exactly one of the password value or its corresponding `*_secret_id`; use a direct Vault secret OCID for the secret ID. |

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
