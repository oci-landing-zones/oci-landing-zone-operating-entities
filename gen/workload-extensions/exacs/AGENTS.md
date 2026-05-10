# EXACS Generator Agent Guide

Scope: this file covers `gen/workload-extensions/exacs/**` and published EXACS snapshots/docs under `workload-extensions/exacs/**`.

## Source Of Truth

- `gen/workload-extensions/exacs/exacs_builder.libsonnet` owns reusable EXACS network, IAM, and observability rendering.
- `gen/workload-extensions/exacs/exacs.libsonnet` is the generic extension wrapper used by config mode.
- `gen/workload-extensions/exacs/published_profiles.libsonnet` owns repo-published EXACS use-case defaults.
- Stack-local `published.libsonnet` files own publication-only projections.
- Checked-in JSON under `workload-extensions/exacs/**` is generated snapshot output. Do not hand-edit it.

## Contract

- Extension type is `exacs`.
- EXACS uses optional network mode.
- If `platform.network` is present, the extension emits a managed VCN with `db` and `backup` subnets.
- If `platform.network` is omitted, the extension contributes IAM and observability only.
- Do not hardcode `prod`, `preprod`, `proj1`, `fra`, or CIDRs in reusable source.
- Multi-stack `oneoe_network_hub_*_post.jsonnet` publication files must be generated from topology and routed VCN entries, not copied from branch hardcoded patches.
