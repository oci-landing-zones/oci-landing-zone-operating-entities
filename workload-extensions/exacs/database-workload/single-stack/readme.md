# ExaDB-D Database Workload — Single-stack Deployment <!-- omit from toc -->

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
| Scope | Regular database workload combined with its matching ExaCS single-stack foundation |
| Resources | Cloud Exadata Infrastructure, VMCs, DB Homes, CDBs, and PDBs |
| State | One Resource Manager stack or one Terraform state with the foundation |
| Publication | UC1–UC3 workload JSON snapshots in this folder |

OCI Resource Manager (ORM) with configuration files in a customer-controlled private OCI Object Storage bucket is the recommended delivery path. Use the pinned OCI Landing Zone Orchestrator source with working directory `rms-facade`. Terraform CLI, customer-controlled CI/CD, and an approved private Git source are supported alternatives.

## 2. Architecture Overview

Complete the matching **ExaCS single-stack foundation** first, then add exactly one workload JSON to the same existing stack and state. UC1 uses shared infrastructure and database resources. UC2 uses shared infrastructure and separate environment VMC-to-PDB chains. UC3 uses two independent infrastructures, each with its own complete chain in `prod` or `preprod`.

The workload document has one `cloud_exadata_database_configuration` root containing five sections: infrastructure, VM clusters, DB Homes, CDBs, and PDBs. All sections share the foundation state, so no intermediate Exadata output dependency is required.

The pinned Exadata module needs known compartment and subnet OCIDs when the workload is planned. Start from an existing foundation state with those resources already created. **Do not include the workload in the initial foundation plan.** Single-stack uses successive applies in one state.

The published single-stack foundation uses Hub E without a firewall. Use it for a PoC, lab, or explicitly non-production deployment that accepts that tradeoff. Production requires a firewall-based design; use Blueprint Factory or the published [Hub A multi-stack foundation](../../multi-stack/readme.md).

## 3. Configuration Files

| Use case | Workload file | Contents |
| --- | --- | --- |
| UC1 | `exacs_cloud_exadata_database_uc1.json` | One shared infrastructure and one shared VMC-to-PDB chain |
| UC2 | `exacs_cloud_exadata_database_uc2.json` | One shared infrastructure and two environment VMC-to-PDB chains |
| UC3 | `exacs_cloud_exadata_database_uc3.json` | Two independent environment infrastructure-to-PDB chains |

Use each workload with the [matching UC Hub E foundation](../../single-stack/readme.md). Use **one Resource Manager stack** or **one Terraform state** for its foundation and workload. The three multi-stack workload documents repeat the same root and must not be combined in this operation.

Before planning, replace the following values in the customer-controlled deployment package:

- `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` with the approved Vault secret OCID for the database administrative password.
- `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY` with an approved SSH public key.
- Region, availability domain, Exadata shape, CPU capacity, Grid Infrastructure version, database version, display names, and database names with reviewed values.

The Vault secret must exist and be readable by the deployment identity. Use a direct secret OCID; the validated Orchestrator contract does not resolve a logical secret key through `secrets_dependency`.

## 4. Deployment Steps

### Prerequisites

- Completed matching UC foundation in the stack/state that will own the workload, including its final observability re-apply.
- Approved secret OCID, SSH public key, versions, capacity, names, and network plan.
- A private configuration location and persistent state/output location.
- The [validated database workload Orchestrator pin](../blueprint-factory.md#1-summary).

### OCI Resource Manager

#### Complete the foundation first

1. Use the matching [foundation guide](../../single-stack/readme.md) with the workload-specific Orchestrator pin and working directory `rms-facade`. Stage only the foundation JSON set in a private Object Storage bucket and create one stack with a persistent output prefix.
2. Plan and apply the foundation. Complete its final observability re-apply in the same stack before adding database resources.
3. Confirm that the matching compartments and database/backup subnets exist and are recorded in this stack's state. An already deployed matching foundation can be reused; retain its state and review the plan when selecting the workload-specific pin.

#### Add the workload to the same stack

1. Add exactly one reviewed workload JSON to the existing stack's configuration inputs. Retain every foundation file, including its final observability document, and all foundation dependencies. Keep the same state and output prefix.
2. Plan the full foundation-and-workload package. Confirm that the plan adds the intended database chain and preserves the existing foundation. Stop and investigate unexpected replacement or removal before applying the saved plan.
3. After the workload exists, retain that workload JSON unchanged in every foundation re-apply, including any final observability re-apply. A foundation-only input set would plan removal of the database resources.

### Terraform CLI

Follow the same two phases with one tfvars file, one working directory/backend, and one state. Set `configuration_source = "file"` and initially list only the matching foundation files in `local_config_file_paths`. Apply the foundation and its final observability configuration first. Then append one reviewed workload file to that list, retain all foundation inputs and required `local_dependency_file_paths`, and plan/apply using the existing foundation state. Retain the workload in every later re-apply. See [Blueprint Factory](../blueprint-factory.md) for the variable contract; its three-state CLI example belongs to config mode and multi-stack.

## 5. Post-Deployment Configuration

Confirm that each infrastructure, VM cluster, DB Home, CDB, and PDB is available before handing the workload to its owner. Review the saved output maps and run a fresh plan against the same state to check for unexpected drift.

This publication supports regular Exadata Database Service on Dedicated Infrastructure. Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are outside this contract. **Manual post-deployment configuration required** for those resources; the workload owner manages lifecycle, drift, and compliance.

## 6. Customization

Use [Blueprint Factory](../blueprint-factory.md) for a different placement, resource count, topology, or address plan. Its config-mode workload outputs are three separate operations; the combined document in this folder is a publication projection. Keep the generated working set and its deployment contract together.

## 7. Troubleshooting

| Symptom | Check |
| --- | --- |
| Workload resources are missing | Supply exactly one combined workload document with all five sections. |
| A compartment or subnet key cannot be resolved | Match the workload UC to the foundation UC and check the selected identity/network files. |
| The first plan reports an unknown `for_each` value | Complete the foundation first and add the workload to its existing state. Do not use a new or empty state for the combined package. |
| The final observability plan removes database resources | Restore the workload file and every unchanged foundation input before planning again. |
| A secret or SSH key fails validation | Replace the required placeholders and check deployment-identity access. |

## 8. Cleanup

The combined state owns the foundation and database workload. Confirm backups, retention requirements, application shutdown, and live dependents before approving a destroy plan. Use the original configuration and the same state, and review the complete plan before applying it.

## 9. Additional Resources

- [Database workload overview](../readme.md)
- [Blueprint Factory customization, dependency variables, verification, and recovery](../blueprint-factory.md)
- [ExaDB-D workload extension overview](../../readme.md)
- [ORM deployment guidance](/commons/content/orm_bp.md)

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
