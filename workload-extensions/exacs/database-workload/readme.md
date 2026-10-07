# ExaDB-D Database Workload — Published Quickstarts <!-- omit from toc -->

- [1. Summary](#1-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Deployment Options](#3-deployment-options)
- [4. Required Substitutions](#4-required-substitutions)
- [5. State and Dependency Boundaries](#5-state-and-dependency-boundaries)
- [6. Support Boundaries](#6-support-boundaries)

## 1. Summary

This package creates a complete regular Exadata Database Service on Dedicated Infrastructure workload. UC1 has one shared infrastructure, VM cluster, DB Home, CDB, and PDB. UC2 has one shared infrastructure and a separate VM cluster, DB Home, CDB, and PDB in each of `prod` and `preprod`. UC3 has one infrastructure and a complete VM cluster to PDB chain in each environment. Deploy it with the matching ExaDB-D single-stack foundation or after the multi-stack foundation is available.

OCI Resource Manager (ORM) with configuration files in a customer-controlled private OCI Object Storage bucket is the recommended delivery path. Use the validated Orchestrator pin in the [Blueprint Factory guide](blueprint-factory.md#1-summary) with working directory `rms-facade`. Terraform CLI, customer-controlled CI/CD, and an approved private Git source are supported alternatives.

## 2. Architecture Overview

| Use case | Infrastructure | VM clusters, DB Homes, CDBs, and PDBs |
| --- | --- | --- |
| UC1 — Shared | One shared infrastructure | One shared chain |
| UC2 — Hybrid | One shared infrastructure | One chain per environment |
| UC3 — Dedicated | One infrastructure per environment | One chain per environment |

The matching foundation supplies compartments and database/backup subnets. The workload references those keys and keeps each UC2/UC3 database chain within its environment.

## 3. Deployment Options

| Path | Use it when | Starting point |
| --- | --- | --- |
| Published UC1 single-stack | You want the matching ExaCS single-stack foundation and database workload to share one state, with the foundation applied first. | [single-stack](single-stack/readme.md) |
| Published UC1 multi-stack | The matching ExaCS multi-stack foundation is already deployed. | [multi-stack](multi-stack/readme.md) |
| Published UC2 single-stack | The UC2 Hub E foundation and both environment workloads belong in one state. | [single-stack](single-stack/readme.md) |
| Published UC2 multi-stack | The UC2 Hub A or Hub E foundation has completed, including its hub post-update. | [multi-stack](multi-stack/readme.md) |
| Published UC3 single-stack | The UC3 Hub E foundation and both independent environment database chains belong in one state. | [single-stack](single-stack/readme.md) |
| Published UC3 multi-stack | The UC3 Hub A or Hub E foundation has completed its hub post-update and re-applies. | [multi-stack](multi-stack/readme.md) |
| Blueprint Factory | You need a different placement, topology, resource count, CIDR plan, or tenancy-specific design. | [Blueprint Factory](blueprint-factory.md) |

Published foundation and regular database workload artifacts cover UC1–UC3. The single-stack path provides one combined workload JSON beside its matching foundation package. The multi-stack path provides three generated workload JSON files per use case. Review and replace tenancy-specific values before deployment.

Hub E has no firewall and is reserved for PoC, lab, or explicitly non-production designs that accept that tradeoff. Production requires a firewall-based hub; Hub A is the published multi-stack option. Use Blueprint Factory for a customized firewalled single-stack package.

## 4. Required Substitutions

Replace and review these values in the copied, customer-controlled deployment package:

- `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` with the approved Vault secret OCID for the database administrative password.
- `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY` with an approved SSH public key.
- Region, availability domain, Exadata shape, CPU capacity, Grid Infrastructure version, database version, display names, and database names.

The source Vault secret must exist and be readable by the deployment identity. The secret OCID is intentionally direct: the pinned Orchestrator contract does not resolve a logical secret key through a `secrets_dependency` file.

## 5. State and Dependency Boundaries

The single-stack path applies the matching ExaCS foundation first, including its final observability configuration. It then adds one `exacs_cloud_exadata_database_uc1.json` (UC1), `exacs_cloud_exadata_database_uc2.json` (UC2), or `exacs_cloud_exadata_database_uc3.json` (UC3) document to the same existing stack/state, retaining the full foundation package. Each combined document has one `cloud_exadata_database_configuration` root and five Exadata sections. Keep that document in every later foundation or observability re-apply. The initial foundation plan must exclude the workload so its compartment and subnet OCIDs exist before the workload is planned.

The multi-stack path deploys the foundation first, then runs three independent workload operations in this order:

1. `exacs_cloud_exadata_infrastructure_uc1.json`, `exacs_cloud_exadata_infrastructure_uc2.json`, or `exacs_cloud_exadata_infrastructure_uc3.json`
2. `exacs_cloud_exadata_vmclusters_uc1.json`, `exacs_cloud_exadata_vmclusters_uc2.json`, or `exacs_cloud_exadata_vmclusters_uc3.json`
3. `exacs_cloud_exadata_databases_uc1.json`, `exacs_cloud_exadata_databases_uc2.json`, or `exacs_cloud_exadata_databases_uc3.json`

Every multi-stack stage writes `cloud_exadata_database_output.json`. The VM-cluster stage consumes only the infrastructure-stage output; the database stage consumes only the VM-cluster-stage output. Do not combine both earlier Exadata outputs in a downstream stage.

## 6. Support Boundaries

This quickstart supports regular Exadata Database Service on Dedicated Infrastructure with Cloud VM Clusters. Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are not generated here. **Manual post-deployment configuration required** for those resources; the workload owner manages lifecycle, drift, and compliance.

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
