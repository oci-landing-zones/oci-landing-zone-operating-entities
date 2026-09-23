# Cloud Exadata Database Workload Quickstart <!-- omit from toc -->

This package creates a complete regular Exadata Database Service on Dedicated Infrastructure workload: Cloud Exadata Infrastructure, a Cloud VM Cluster, a DB Home, a CDB, and a PDB. It is deployed after the ExaDB-D Landing Zone foundation is available.

## Choose a deployment path

| Path | Use it when | Starting point |
| --- | --- | --- |
| Published UC1 single-stack | The matching ExaCS single-stack foundation is already deployed. | [single-stack](single-stack/readme.md) |
| Published UC1 multi-stack | The matching ExaCS multi-stack foundation is already deployed. | [multi-stack](multi-stack/readme.md) |
| Blueprint Factory | You need a different placement, topology, resource count, CIDR plan, or tenancy-specific design. | [Blueprint Factory](blueprint-factory.md) |

The published UC1 paths provide three generated JSON templates. They are a complete workload example, but they are not safe to deploy without review and replacement of tenancy-specific values.

## Required substitutions before planning

Replace and review these values in the copied, customer-controlled deployment package:

- `ocid1.vaultsecret.oc1..REPLACE_WITH_SECRET_OCID` with the approved Vault secret OCID for the database administrative password.
- `ssh-rsa REPLACE_WITH_APPROVED_PUBLIC_KEY` with an approved SSH public key.
- Region, availability domain, Exadata shape, CPU capacity, Grid Infrastructure version, database version, display names, and database names.

The source Vault secret must exist and be readable by the deployment identity. The secret OCID is intentionally direct: the pinned Orchestrator contract does not resolve a logical secret key through a `secrets_dependency` file.

## Three ordered workload states

The three files share the `cloud_exadata_database_configuration` root, so they cannot be combined into a single Orchestrator operation. Deploy them in this order, keeping a separate state and output location for each stage:

1. `exacs_cloud_exadata_infrastructure.json`
2. `exacs_cloud_exadata_vmclusters.json`
3. `exacs_cloud_exadata_databases.json`

Every stage writes `cloud_exadata_database_output.json`. The VM-cluster stage consumes only the infrastructure-stage output; the database stage consumes only the VM-cluster-stage output. Do not combine both earlier Exadata outputs in a downstream stage.

Use OCI Resource Manager with files staged in a customer-controlled private Object Storage bucket, a customer-controlled CI/CD pipeline, or an approved private Git source. Do not use public raw URLs or public buckets as production configuration sources.

## Scope boundary

This quickstart supports regular Exadata Database Service on Dedicated Infrastructure with Cloud VM Clusters. Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are not generated here. **Manual post-deployment configuration required** for those resources; the workload owner manages lifecycle, drift, and compliance.

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.
See [LICENSE](/LICENSE.txt) for more details.
