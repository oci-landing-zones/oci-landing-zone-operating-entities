# ExaDB-D Database Workload — Multi-stack Deployment <!-- omit from toc -->

- [1. Summary](#1-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Configuration Files](#3-configuration-files)
- [4. Deployment Steps](#4-deployment-steps)
- [5. Post-Deployment Configuration](#5-post-deployment-configuration)
- [6. Customization](#6-customization)
- [7. Troubleshooting](#7-troubleshooting)
- [8. Cleanup](#8-cleanup)
- [9. Additional Resources](#9-additional-resources)

## 1. Summary

| Item | Description |
| --- | --- |
| Scope | Regular database workload after its matching ExaCS multi-stack foundation |
| Resources | Cloud Exadata Infrastructure, VMCs, DB Homes, CDBs, and PDBs |
| State | Three ordered workload states, separate from the foundation |
| Publication | UC1–UC3 workload JSON snapshots in this folder |

OCI Resource Manager (ORM) with configuration files in a customer-controlled private OCI Object Storage bucket is the recommended delivery path. Use the pinned OCI Landing Zone Orchestrator source with working directory `rms-facade`. Terraform CLI, customer-controlled CI/CD, and an approved private Git source are supported alternatives.

## 2. Architecture Overview

Complete the matching **ExaCS multi-stack foundation**, including the **hub post-update** and final network and observability re-applies, before starting this flow. The foundation owns compartments, IAM, networking, routing, security, and observability. UC2 and UC3 support the published [Hub A or Hub E foundation](../../multi-stack/readme.md).

The workload uses three ordered operations: infrastructure, VM clusters, and database objects. Each operation supplies one `cloud_exadata_database_configuration` document and owns a separate state. The VM-cluster stage consumes only the immediately preceding infrastructure output as its Exadata dependency; the database stage consumes only the VM-cluster output, alongside its applicable foundation dependencies.

UC1 creates one shared infrastructure-to-PDB chain. UC2 creates one shared infrastructure and two environment VMC-to-PDB chains. UC3 creates two independent infrastructures, two VMCs, two DB Homes, two CDBs, and two PDBs; both environments are grouped within each stage.

## 3. Configuration Files

| Use case | Infrastructure stage | VM-cluster stage | Database-object stage |
| --- | --- | --- | --- |
| UC1 | `exacs_cloud_exadata_infrastructure_uc1.json` | `exacs_cloud_exadata_vmclusters_uc1.json` | `exacs_cloud_exadata_databases_uc1.json` |
| UC2 | `exacs_cloud_exadata_infrastructure_uc2.json` | `exacs_cloud_exadata_vmclusters_uc2.json` | `exacs_cloud_exadata_databases_uc2.json` |
| UC3 | `exacs_cloud_exadata_infrastructure_uc3.json` | `exacs_cloud_exadata_vmclusters_uc3.json` | `exacs_cloud_exadata_databases_uc3.json` |

Choose one UC and keep its three files in separate operations. Do not include foundation configuration JSON as workload inputs; supply the foundation outputs as dependencies.

| Stage | Exadata input | Persistent output prefix |
| --- | --- | --- |
| Infrastructure | None | `runtime/exacs/infrastructure/output/` |
| VM clusters | Infrastructure-stage output only | `runtime/exacs/vmclusters/output/` |
| Database objects | VM-cluster-stage output only | `runtime/exacs/databases/output/` |

Those prefixes describe UC1. For UC2 use `runtime/exacs/uc2/infrastructure/output/`, `runtime/exacs/uc2/vmclusters/output/`, and `runtime/exacs/uc2/databases/output/`. For UC3 use `runtime/exacs/uc3/infrastructure/output/`, `runtime/exacs/uc3/vmclusters/output/`, and `runtime/exacs/uc3/databases/output/`. Each stage writes its own `cloud_exadata_database_output.json`.

Before planning, replace the following values in the customer-controlled deployment package:

- `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` with the approved Vault secret OCID for the database administrative password.
- `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY` with an approved SSH public key.
- Region, availability domain, Exadata shape, CPU capacity, Grid Infrastructure version, database version, display names, and database names with reviewed values.

The Vault secret must exist and be readable by the deployment identity. Use a direct secret OCID; the validated Orchestrator contract does not resolve a logical secret key through `secrets_dependency`.

## 4. Deployment Steps

### Prerequisites

- Completed matching foundation, hub post-update, and final re-applies.
- Persistent foundation compartment/network outputs and any required subscription, KMS, or Recovery Service outputs.
- Approved workload substitutions and reviewed Exadata capacity.
- The [validated database workload Orchestrator pin](../blueprint-factory.md#1-summary).
- Separate state and output locations for each stage.

### OCI Resource Manager

1. Stage the selected workload files and dependencies in a private Object Storage bucket.
2. Create three stacks from the validated Orchestrator source with working directory `rms-facade`. Give each one configuration JSON, its own output prefix, and its applicable foundation dependencies.
3. Plan and apply infrastructure with the required compartment output and any applicable subscription output.
4. Confirm infrastructure availability and its saved output. Plan and apply VM clusters using foundation compartment/network outputs and only the infrastructure-stage Exadata output.
5. Confirm VM-cluster availability and its saved output. Plan and apply database objects using only the VM-cluster-stage Exadata output, plus any applicable foundation, KMS, or Recovery Service dependencies.

Review each saved plan before applying it. Supply only the immediately preceding Exadata output to the next stage; do not combine both earlier outputs.

### Terraform CLI

Use one tfvars file, state, and output directory per stage. Set `configuration_source = "file"`, put only the stage's JSON in `local_config_file_paths`, and list its foundation dependencies and immediate upstream Exadata output in `local_dependency_file_paths`. Use the [Blueprint Factory deployment contract](../blueprint-factory.md#5-deployment-contract) for detailed variables and sequential plan/apply commands.

## 5. Post-Deployment Configuration

Confirm that each infrastructure, VM cluster, DB Home, CDB, and PDB is available before handing the workload to its owner. Review the saved output maps and run a fresh plan against the same state to check for unexpected drift.

This publication supports regular Exadata Database Service on Dedicated Infrastructure. Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are outside this contract. **Manual post-deployment configuration required** for those resources; the workload owner manages lifecycle, drift, and compliance.

If a stage fails, correct and re-plan that stage using its original state. Keep the upstream configurations and outputs available, and confirm recovery before continuing downstream.

## 6. Customization

Use [Blueprint Factory](../blueprint-factory.md) when the published placement, resource count, topology, or address plan does not fit. Keep generated outputs together and retain their three-stage contract.

## 7. Troubleshooting

| Symptom | Check |
| --- | --- |
| A VMC cannot resolve its infrastructure | Supply the selected UC's infrastructure output and the required foundation dependencies. |
| A database object cannot resolve its parent | Supply the VM-cluster output as the only Exadata dependency. |
| A stage plans removal of upstream resources | Verify its separate state and stage-specific configuration set. |
| An output has been overwritten | Restore the correct upstream output and assign distinct output prefixes before re-planning. |

## 8. Cleanup

Review backups, retention requirements, and application shutdown before any destroy plan. Remove database objects first, VM clusters second, and infrastructure last. Use each stage's original configuration, dependencies, and state. Keep the foundation available until all database dependents have been removed.

## 9. Additional Resources

- [Database workload overview](../readme.md)
- [Blueprint Factory customization, dependency variables, verification, and recovery](../blueprint-factory.md)
- [ExaDB-D workload extension overview](../../readme.md)
- [ORM deployment guidance](/commons/content/orm_bp.md)

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
