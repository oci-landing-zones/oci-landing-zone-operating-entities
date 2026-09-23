# Published ExaDB-D workload UC1 quickstart

## Goal

Publish a standard, source-generated UC1 Cloud Exadata Database workload quickstart that has the same discoverability and documentation hierarchy as the OKE quickstarts. It must support both existing ExaCS foundation paths: `single-stack` and `multi-stack`.

The quickstart creates a complete regular Exadata Database Service on Dedicated Infrastructure workload: Cloud Exadata Infrastructure, Cloud VM Cluster, DB Home, CDB, and PDB.

## Scope

Add a published deployment package beneath `workload-extensions/exacs/database-workload/`:

```
database-workload/
  readme.md
  single-stack/
    exacs_cloud_exadata_infrastructure.json
    exacs_cloud_exadata_vmclusters.json
    exacs_cloud_exadata_databases.json
    readme.md
  multi-stack/
    exacs_cloud_exadata_infrastructure.json
    exacs_cloud_exadata_vmclusters.json
    exacs_cloud_exadata_databases.json
    readme.md
```

The three JSON files are generated snapshots from a single published UC1 source profile. They are not hand-maintained. The root and stack-local README files are customer-facing deployment guidance following the OKE documentation pattern.

## Customer-facing contract

The package is a complete quickstart template, not an as-is deployment. Before creating a plan, the deployer must replace and review tenancy-specific values, including:

- Vault secret OCIDs for database administrative passwords;
- approved SSH public keys;
- OCI region and availability-domain values;
- Exadata shape, capacity, and database-version choices;
- customer resource names and other values that must match the selected tenancy.

The docs direct customers to stage reviewed artifacts in a customer-controlled private Object Storage bucket or an approved private Git source. They do not recommend public raw URLs as a deployment source.

## Deployment architecture

The ExaDB-D workload uses three independent, ordered Orchestrator states because every document has the same top-level `cloud_exadata_database_configuration` family and cannot safely be deep-merged:

1. `exacs_cloud_exadata_infrastructure.json` creates the Cloud Exadata Infrastructure and saves `cloud_exadata_database_output.json` to an infrastructure-specific output location.
2. `exacs_cloud_exadata_vmclusters.json` consumes only the infrastructure stage's Exadata output, alongside its required persistent foundation outputs, creates the Cloud VM Cluster, and saves a VM-cluster-specific output.
3. `exacs_cloud_exadata_databases.json` consumes only the VM-cluster stage's Exadata output, creates the DB Home, CDB, and PDB, and saves its own output.

Each stage has a distinct Resource Manager stack or Terraform state and a distinct output directory/prefix. A downstream stack must not receive both previous Exadata output files. The workflow intentionally differs from OKE's `_pre`/full re-apply sequence.

## Single-stack and multi-stack integration

Both published folders contain the full UC1 workload package. Their stack-local README files describe the correct foundation prerequisite and its dependency outputs:

- `single-stack` starts after the corresponding ExaCS single-stack foundation and its required post-update/final re-apply are complete.
- `multi-stack` starts after the matching ExaCS multi-stack foundation, hub post-update, and final network/observability re-apply are complete.

The workload artifacts may have equivalent logical content, but their foundation handoff documentation must remain separate and precise.

## Source and publication boundaries

- `gen/workload-extensions/exacs/exacs_database_workload.libsonnet` remains the workload-operation source of truth.
- A dedicated published UC1 profile and stack publication projections generate the committed JSON snapshots.
- Existing published ExaCS foundation JSON files remain foundation prerequisites; they are not bundled into any workload stage.
- Blueprint Factory remains the supported customization path for other placement models, topology choices, resource counts, names, CIDRs, or tenancy-specific design needs.

## Validation

Automated coverage must prove that the published UC1 profile produces exactly the three workload files and that each carries only its intended Exadata operation section. Tests must also assert the expected logical references between infrastructure, VM Cluster, and database resources, and reject an attempt to treat the three same-root documents as a single deep-merged stack.

Publication verification regenerates snapshots and confirms that the working tree stays clean. Documentation checks ensure every listed JSON file exists and that no README claims the package can be deployed without required customer substitutions.

Terraform initialization, validation, planning, and OCI deployment are out of scope for this repository change. They require separate explicit authorization and customer-specific credentials and inputs.
