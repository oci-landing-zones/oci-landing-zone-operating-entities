# ExaDB-D / ExaCS Generator Agent Guide

Scope: this file covers `gen/workload-extensions/exacs/**` and published ExaCS snapshots/docs under `workload-extensions/exacs/**`. Root `AGENTS.md` owns customer safety, base landing-zone discovery, and deployment defaults; this file owns ExaDB-D / ExaCS extension semantics.

## Source Of Truth

- `gen/workload-extensions/exacs/exacs_builder.libsonnet` owns reusable ExaCS network, IAM, and observability rendering.
- `gen/workload-extensions/exacs/exacs_database_workload.libsonnet` owns the config-driven Cloud Exadata Database operation projection.
- `gen/workload-extensions/exacs/exacs.libsonnet` is the generic extension wrapper used by config mode.
- `gen/workload-extensions/exacs/published_profiles.libsonnet` owns repo-published ExaCS use-case defaults.
- Stack-local `published.libsonnet` files own publication-only projections.
- Checked-in JSON under `workload-extensions/exacs/**` is generated snapshot output. Do not hand-edit it.

## Contract

- Extension type is `exacs`.
- ExaCS component selection is inferred from platform placement, `platform.network`, and `project_db_compartments`.
- If database placement is inferred, the platform represents AVMC/VMC placement and requires `platform.network`. The extension emits a managed VCN with `db` and `backup` subnets.
- If infrastructure-only placement is inferred, the platform must omit `platform.network`. It must not emit database child compartments, AVMC/VMC permissions, database alarms, or VMC event rules for that scope.
- `project_db_compartments` is only for Autonomous Database Dedicated project tiers. It requires database placement but does not require `project_network`.
- Regular Exadata Database Service-only designs use VMC placement and must omit `project_db_compartments`.
- `exacs_database_workload` is opt-in and currently supports regular Exadata Database Service on Dedicated Infrastructure only. Config mode emits three separate `cloud_exadata_database_configuration` documents for infrastructure, VM clusters, and database objects. The published UC1 single-stack adapter instead combines their distinct nested sections into one document for the same state as the matching foundation; it asserts that no section is duplicated.
- ExaCS database-workload VM Cluster and database operations require database placement with `platform.network`; infrastructure-only scopes may emit only the infrastructure operation. The builder injects the source-backed platform compartment and, for VMCs, the managed `db` and `backup` subnet keys.
- ExaCS database-workload logical resource keys must be unique within each operation section across every selected ExaCS scope; the generator rejects duplicates rather than overlaying them.
- Keep config-mode and published multi-stack ExaCS database-workload operations as sequential Orchestrator stacks. Their common root family is not a safe multi-file deep-merge boundary. Save `cloud_exadata_database_output.json` after each stage and supply it as `exadata_database_dependency` to the next stage. The published UC1 single-stack adapter is the only exception: it supplies one combined root document rather than multiple colliding files.
- Autonomous VM Clusters, Autonomous Container Databases, and Autonomous Database Dedicated lifecycle are not part of this ExaCS database-workload contract. Do not add those sections without an inspected Orchestrator and backing-module contract plus dedicated source, tests, and documentation.
- Do not hardcode `prod`, `preprod`, `proj1`, `fra`, or CIDRs in reusable source.
- Multi-stack `oneoe_network_hub_*_post.jsonnet` publication files must be generated from topology and routed VCN entries, not copied from branch hardcoded patches.

## Placement Mapping

- Shared infrastructure plus shared AVMC/VMC uses only `shared_platforms.exacs` with `network`.
- Shared infrastructure plus environment-specific AVMC/VMC uses `shared_platforms.exacs` without `network` and networked `environments.<env>.platforms.exacs`.
- Environment-specific infrastructure plus environment-specific AVMC/VMC uses only networked `environments.<env>.platforms.exacs`.
- Autonomous Dedicated project tiers are added only through `project_db_compartments` for selected projects.
- Shared ExaCS without `network` means shared infrastructure-only. Do not grant AVMC/VMC permissions for that shared scope.

## Extension Discovery Addendum

After root `AGENTS.md` base landing-zone discovery is complete and ExaCS is in scope, ask these decisions before CIDR allocation or config authoring:

1. Is Exadata infrastructure shared across environments, or dedicated per environment?
2. Will the customer use Autonomous Database Dedicated on AVMCs, regular Exadata Database Service on VMCs, or both?
3. Are AVMCs/VMCs shared, or dedicated per environment?
4. For Autonomous Database Dedicated, which environments and projects need project DB tiers?
5. For the chosen AVMC/VMC and application/project network scopes, what sizing inputs affect CIDR planning, such as environment count, expected database network growth, VM/application network growth, or future reserved environments?

CIDR questions come after these decisions. Request ExaCS CIDRs only for chosen AVMC/VMC and application/project network scopes. Do not request or reserve CIDRs for unchosen placement branches. Do not assign a CIDR to infrastructure-only ExaCS scopes.
