# ExaDB-XS Generator Guide

## Source of truth

- `exaxs_builder.libsonnet` owns ExaDB-XS network rendering and metadata.
- `render.libsonnet`, `iam.libsonnet`, `observability.libsonnet`, and `events.libsonnet` own the ExaDB-XS contributions to the One-OE foundation.
- `published_profiles.libsonnet` owns the UC1–UC3 sample topology and values. `single-stack/*.jsonnet` are thin output selectors.
- `workload-extensions/exaxs/single-stack/*.json` are generated snapshots. Change Jsonnet source first, then regenerate the JSON; do not hand-edit snapshots.

## Contract

- Extension type: `exaxs`.
- A platform without `network` represents Storage Vault placement only. A networked platform has `db` and `backup` subnets and represents VM Cluster and database placement. UC1 shares both scopes, UC2 shares Vault placement and uses environment VM Clusters, and UC3 places both scopes per environment.
- ExaDB-XS does not emit Autonomous VM Clusters, Autonomous Databases, ExaDB-D infrastructure, or project database compartments.
- The emitted JSON establishes Landing Zone prerequisites, including compartment, IAM, network, Events, Alarms, and Notification configuration. It does not create Storage Vaults, VM Clusters, Database Homes, or databases.
- OCI IAM permits `use exascale-db-storage-vaults` to update Vaults as well as satisfy the VM Cluster dependency. Review that grant and the full cluster operation workflow before deployment.
- The alarm examples are disabled and notification addresses are placeholders until reviewed for a target tenancy.
