---
name: landing-zone-config
description: Use when authoring, reviewing, or debugging the config-driven OCI landing zone Jsonnet input used by `gen/generate.sh --config`, especially when adding environments, shared platforms, environment platforms, hub changes, or extension-backed network layouts.
---

# Landing Zone Config

## Overview

Use this skill when work should go through the new config-driven generator instead of editing generated JSON files directly.

Core principle: treat the landing zone config as the source of truth, then verify behavior against the generator's normalization and orchestration code before changing schema assumptions.

## When to Use

- Creating a new config file for `bash gen/generate.sh --config ...`
- Reviewing or fixing a config-driven topology change
- Adding or changing `environments`, `shared_project_network`, `platforms`, or `shared_platforms`
- Wiring a platform extension such as `oke_simple`
- Debugging why config mode generated an unexpected JSON output or omitted a file

Do not use this skill for legacy checked-in JSON output edits unless the task is explicitly about the config-driven path.

## Workflow

1. Start with the source-of-truth files:
   - `gen/CONVENTIONS.md` for architecture and schema intent
   - `gen/config.libsonnet` for required fields and normalization rules
   - `gen/landing_zone.libsonnet` for orchestration and topology behavior
   - `gen/landing_zone_multi.jsonnet` for config-mode outputs
2. Build the config as a Jsonnet object, not raw JSON, so imports and composition stay available.
3. Keep only the smallest top-level shape first: `hub` and non-empty `environments`, plus `region` / `region_short_name` only when overriding their defaults.
4. Add environments and platforms incrementally, then run config mode and inspect the generated outputs.
5. When behavior is unclear, prefer reading the normalization and extension code over guessing from checked-in JSON.

## Quick Rules

| Topic | Rule |
|---|---|
| Required fields | `hub.kind`, `hub.network.vcn`, and non-empty `environments` are mandatory. |
| Region defaults | `region` defaults to `eu-frankfurt-1` and `region_short_name` defaults to `fra`; both also default when explicitly set to `null`. |
| Hub kinds | Only `hub_a`, `hub_b`, `hub_c`, and `hub_e` are valid. |
| Hub subnets | Omit `hub.network.subnets` to auto-generate canonical hub subnets from the hub VCN. |
| Spoke subnets | Omit `shared_project_network.network.subnets` to auto-generate `web`, `app`, `db`, and `infra`. |
| Platform subnets | Platforms need explicit subnets unless they also declare an extension that provides subnet metadata. |
| Realm | `realm` is optional and defaults to `oc1`, including when explicitly set to `null`. |
| Extensions | Extension `type` must be registered in `gen/landing_zone.libsonnet`. |
| Config-mode network outputs | `network.json` is canonical final output; `network_pre.json` appears only for staged hubs. |

## Authoring Guidance

- Prefer one small config file per scenario and compose from imports if reuse is needed.
- Use `shared_project_network` only for environments that should produce spoke VCN outputs.
- Put environment-scoped platforms under `environments.<env>.platforms`.
- Put shared platforms under top-level `shared_platforms`.
- Keep CIDRs explicit even when subnets are auto-generated. Auto-subnetting helps with subnet layout, not top-level network planning.
- When adding a new extension-backed platform, verify both the config schema and the extension contract.

## Verification

- Run `bash gen/generate.sh --config <config_file> [output_dir]` for normal config-mode generation.
- If you need raw multi-output behavior without formatting, run `jsonnet --multi <output_dir>/ --tla-code-file config=<config_file> gen/landing_zone_multi.jsonnet`.
- Compare generated files with the expected output set from `gen/landing_zone_multi.jsonnet`: `network.json` and common domain outputs are always emitted, `network_pre.json` is emitted only for staged hubs, and `network_backends.json` plus extension outputs remain conditional.

## References

- For the schema and behavior map, read `references/schema-and-behavior.md`.
- For starter patterns and repo-native examples, read `references/examples.md`.

## Common Mistakes

- Editing generated JSON and forgetting to fix the config or Jsonnet source.
- Assuming every platform can auto-generate subnets. Plain platforms without an extension cannot.
- Forgetting that only environments with `shared_project_network` become spokes.
- Expecting non-prod environments to inherit every security-target behavior. Topology rules are centralized in `gen/topology.libsonnet`.
- Adding an extension `type` in config without registering it in `gen/landing_zone.libsonnet`.
