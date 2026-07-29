# OCI Native Database Observability Add-on

This add-on extends new or existing OCI Landing Zones with production-oriented
Database Management, Operations Insights, and Log Analytics capabilities. It
replaces database-by-database console guides with a versioned fleet manifest,
bounded rollout waves, executable Terraform roots, and guarded Log Analytics
collection workflows.

Target lifecycle automation consumes the pinned
[`terraform-oci-database-observability`](https://github.com/adibirzu/terraform-oci-database-observability)
release as an implementation engine. This repository exposes only the Landing
Zone automation workflow: scenario foundations, dependency-map integration,
bounded fleet waves, guarded execution, and product verification.

## Database Management target catalog

The project follows the same target names used by the Database Management
Add-ons page. Each Terraform link is a self-contained Resource
Manager-compatible root suitable for a future “Terraform script” column. Every
root includes `schema.yaml`, a reviewed provider lock, an input template, and
target-specific lifecycle documentation.

| Target name | Terraform automation | Status |
| --- | --- | --- |
| Autonomous database | [`scenario-autonomous-databases/terraform`](./scenario-autonomous-databases/terraform/) | Available |
| Base Database | [`scenario-base-databases/terraform`](./scenario-base-databases/terraform/) | Available |
| EXACS | [`scenario-exacs-databases/terraform`](./scenario-exacs-databases/terraform/) | Available |
| EXACC | [`scenario-exacc-databases/terraform`](./scenario-exacc-databases/terraform/) | Available with host prerequisites |
| External Databases | [`scenario-external-databases/terraform`](./scenario-external-databases/terraform/) | Available with host prerequisites |

See the copy-ready [Database Management Add-ons mapping](./database-management-addons.md).

## Product capabilities

| Product | Automated capability | Large-scale enablement | Guide |
| --- | --- | --- | --- |
| Database Management | CDB, PDB, and non-CDB lifecycle over private endpoints with Vault-backed credentials | Deterministic waves of up to 200 targets; CDB/PDB families stay together | [Database Management](./products/database-management.md) |
| Operations Insights | Explicit DBM-co-managed Database Insights | Platform/deployment validation and the same bounded waves | [Operations Insights](./products/operations-insights.md) |
| Log Analytics | Oracle-defined source discovery, Management Agent association, historical upload, and ingestion proof | One guarded collection input per target | [Log Analytics](./products/log-analytics.md) |

## Supported target contracts

| Platform | DBM | OPSI | Log Analytics | Notes |
| --- | --- | --- | --- | --- |
| Base Database Service | Automated | Automated | Automated | VM and bare-metal deployment types are explicit |
| Exadata Database Service | Automated | Automated | Automated | OPSI deployment type is `EXACS` |
| Exadata Cloud@Customer | Automated DBM manifest | Not emitted | Automated | Require a customer-network canary before fleet promotion |
| Autonomous Database | Automated | Foundation only | Foundation only | Uses the ADB-specific DBM feature-management resource |
| External Database | Automated | Separate registration contract | Automated | Uses Management Agent-based external registration |

“Automated” describes the implemented repository contract, not proof of a live
customer deployment.

## Customer journeys

### Existing Landing Zone

1. Reuse existing compartments, subnets, NSGs, private endpoints, databases,
   and Vault secrets through stable dependency keys.
2. Reconcile any already-managed resource into exactly one Terraform state
   using reviewed import/move operations.
3. Render a canary wave, review a saved plan, apply that unchanged plan, and
   verify each selected product before promoting the next wave.

### New Landing Zone

1. Apply the scenario JSONs for IAM, network, security, Vault, and compartment
   foundations through the normal Landing Zone workflow.
2. Apply the [resource-scoped Vault policy](./foundation-policy/) when an
   equivalent customer-owned identity policy does not already exist.
3. Populate the fleet manifest with the resulting dependency keys.
4. Render and promote bounded waves with one OCI Resource Manager stack state
   per wave.

## Fleet quick start

The adapter is pinned to the `v0.3.1` release commit in
[`fleet-onboarding/main.tf`](./fleet-onboarding/main.tf). The guarded runner
verifies that commit, renders waves, and replaces each generated DBM root with
the commit-pinned LZ adapter:

```text
cp examples/new-landing-zone.manifest.json fleet.local.json
chmod 600 fleet.local.json

scripts/run-fleet.sh render fleet.local.json rendered-fleet
scripts/run-fleet.sh plan rendered-fleet/wave-001 reviewed.tfplan
scripts/run-fleet.sh package rendered-fleet/wave-001 \
  ../../wave-001-resource-manager.zip

scripts/run-fleet.sh logan-validate \
  rendered-fleet/wave-001/log-analytics/DB-KEY.collection.json
scripts/run-fleet.sh logan-apply \
  rendered-fleet/wave-001/log-analytics/DB-KEY.collection.json --apply
scripts/run-fleet.sh logan-verify \
  rendered-fleet/wave-001/log-analytics/DB-KEY.collection.json
```

The package command validates Terraform and `schema.yaml`, then builds a
root-level Resource Manager archive without `.terraform`, state, plans, or
populated non-JSON tfvars. Upload the ZIP as one stack; do not run the same
resource set through local Terraform.

### Choose the Landing Zone fleet pattern

| Database targets | LZ manifest strategy | Starting wave size | Promotion model |
| ---: | --- | ---: | --- |
| 1 | One manifest populated from LZ outputs | 1 | The database is the canary; verify all selected products |
| 2 | One manifest | 1 or 2 | Use one target first for canary isolation, or keep both in one shared change window; CDB/PDB families stay together |
| 100 | One manifest | 10–25 | Prove one representative wave, then promote bounded waves |
| 1,000 | One manifest | 50–100 | Use 10–20 waves; 200 is the hard maximum, not the default |
| More than 1,000 | Multiple LZ manifests of at most 1,000 targets each | 50–100 per manifest | Partition by region, environment, operating entity, network domain, or maintenance owner |

For more than 1,000 targets, use at least
`ceiling(database_targets / 1000)` manifests. Each manifest requires a unique
`fleet.name`, `fleet.lifecycle_id`, output directory, rollout ledger, and
separate OCI Resource Manager stack state for every generated Terraform wave.
Never split a CDB/PDB family across manifests.

```text
scripts/run-fleet.sh render \
  fleets/oe1-emea-production.local.json \
  rendered-fleet/oe1-emea-production

scripts/run-fleet.sh render \
  fleets/oe2-amer-production.local.json \
  rendered-fleet/oe2-amer-production
```

The wave size is a blast-radius limit, not automatic parallelism. Parallel
promotion requires separate states, change owners, rollback paths, and verified
OCI service and Management Agent capacity. A failed wave stops its manifest and
any other manifest sharing the affected endpoint, agent, network, or operating
failure domain.

Every DBM wave is a complete Terraform root pinned to the reviewed release
commit. Every Log Analytics target receives a collection JSON for the guarded
operator script. Populated manifests, generated tfvars, state, plans, wallets,
and credentials must not be committed.

## Deployment gates

For each wave:

1. validate JSON and Terraform;
2. select an explicit OCI context and execute the generated root through the
   Landing Zone's OCI Resource Manager stack/state boundary;
3. review a saved plan for IAM, network, replacement, and delete actions;
4. upload the validated package to its OCI Resource Manager stack, review the
   Resource Manager plan, and apply that exact plan to a canary;
5. verify current DBM/OPSI data and actual Log Analytics rows;
6. record the rollback owner and approve promotion.

Base Database, EXACS, EXACC, and external CDB/PDB offboarding uses staged
`DISABLE_TARGETS` then `DISABLE_CDB`. ADB uses its per-target
`enable_database_management = false` action. Verify the disabled product state
before removing resources; `terraform destroy` is not a substitute.

## Assets

- [Fleet adapter](./fleet-onboarding/)
- [Database Management Add-ons mapping](./database-management-addons.md)
- [Resource-scoped Vault policy](./foundation-policy/)
- [New Landing Zone journey](./journeys/new-landing-zone.md)
- [Existing Landing Zone journey](./journeys/existing-landing-zone.md)
- [Machine-readable add-on specification](./addon-spec.json)
- [Base Database / ExaCS scenario](./scenario-exacs-databases/readme.md)
- [Base Database scenario](./scenario-base-databases/terraform/)
- [ExaCC scenario](./scenario-exacc-databases/readme.md)
- [Autonomous Database scenario](./scenario-autonomous-databases/readme.md)
- [External Database scenario](./scenario-external-databases/readme.md)

## License

Copyright (c) 2025, 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0. See
[LICENSE](/LICENSE.txt).
