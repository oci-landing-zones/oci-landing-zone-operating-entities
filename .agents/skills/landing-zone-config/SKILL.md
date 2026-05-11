---
name: landing-zone-config
description: Use when authoring, reviewing, or debugging the config-driven OCI landing zone Jsonnet input used by `gen/generate.sh --config`, especially when adding environments, shared platforms, environment platforms, hub changes, or extension-backed network layouts.
---

# Landing Zone Config

## Overview

Use this skill when work should go through the new config-driven generator instead of editing generated JSON files directly.

Core principle: treat the landing zone config as the source of truth, then verify behavior against the generator's normalization and orchestration code before changing schema assumptions.

If the request starts as customer design or deployment guidance and the customer path is not yet chosen, use `landing-zone-customer-guidance` first. This skill starts after the conversation has reached the config-driven path or the user explicitly asks for config-mode details.

## When to Use

- Creating a new config file for `bash gen/generate.sh --config ...`
- Reviewing or fixing a config-driven topology change
- Adding or changing `environments`, `shared_project_network`, `platforms`, or `shared_platforms`
- Wiring a platform extension such as `oke_simple`
- Debugging why config mode generated an unexpected JSON output or omitted a file

Do not use this skill for legacy checked-in JSON output edits unless the task is explicitly about the config-driven path.
Do not use this skill as the first response to an open-ended customer request such as "I want landing zone to run OKE" when the required customer discovery decisions are still unknown.

## Workflow

1. Start with the source-of-truth files:
   - `gen/AGENTS.md` for architecture, schema intent, and generator guardrails
   - `gen/config.libsonnet` for required fields and normalization rules
   - `gen/landing_zone.libsonnet` for orchestration and topology behavior
   - `gen/landing_zone_multi.jsonnet` for config-mode outputs
2. Before creating files, ask where the config source file should live and where the generated landing zone outputs should go. Use separate paths.
3. Build the config as a Jsonnet object, not raw JSON, so imports and composition stay available.
4. Keep only the smallest top-level shape first: `hub` and non-empty `environments`, plus `region` / `region_short_name` only when overriding their defaults as a pair.
5. Add environments and platforms incrementally, then run config mode and inspect the generated outputs.
6. When behavior is unclear, prefer reading the normalization and extension code over guessing from checked-in JSON.

## Quick Rules

| Topic | Rule |
|---|---|
| Required fields | `hub.kind`, `hub.network.vcn`, and non-empty `environments` are mandatory. |
| Region defaults | `region` and `region_short_name` must be provided together or omitted together; when omitted (or both explicitly set to `null`) they default to `eu-frankfurt-1` and `fra`. |
| Security targets | Omit `security_targets` to target all environments; set it explicitly to narrow which environments get security-zone targeting. |
| Hub kinds | Only `hub_a`, `hub_b`, `hub_c`, and `hub_e` are valid. |
| Hub subnets | Omit `hub.network.subnets` to auto-generate canonical hub subnets from the hub VCN. |
| Spoke subnets | Omit `shared_project_network.network.subnets` to auto-generate `web`, `app`, `db`, and `infra`. |
| Platform subnets | Platforms need explicit subnets unless they also declare an extension that provides subnet metadata. |
| Realm | `realm` is optional and defaults to `oc1`, including when explicitly set to `null`. |
| Extensions | Extension `type` must be registered in `gen/landing_zone.libsonnet`. |
| Config-mode network outputs | `network.json` is canonical final output; `network_pre.json` appears only for staged hubs. |
| Artifact placement | Ask for both the config file location and the output directory before creating customer artifacts; do not default them into `tests/`. |
| Unsupported resources | Do not add unsupported config keys or fake extension types. Generate only supported prerequisites, then document the unsupported resource as manual post-deployment configuration. |
| ExaCS network | Network is required for ExaCS AVMC/VMC placement and forbidden for ExaCS infrastructure-only placement. |
| ExaCS project DB tiers | Use `project_db_compartments` only for Autonomous Database Dedicated project tiers; `shared_project_network` is only needed when the environment also needs project network resources. |

## Authoring Guidance

- Prefer one small config file per scenario and compose from imports if reuse is needed.
- For customer-use work, keep config sources and generated outputs in customer-chosen or explicitly approved working directories. Reserve `tests/gen/testdata/...` for repo-development fixtures and automated tests, not customer artifact placement.
- Use `shared_project_network` only for environments that should produce spoke VCN outputs.
- Put environment-scoped platforms under `environments.<env>.platforms`.
- Put shared platforms under top-level `shared_platforms`.
- Keep CIDRs explicit even when subnets are auto-generated. Auto-subnetting helps with subnet layout, not top-level network planning.
- When selecting CIDRs, check whether the landing zone will connect to on-premises or other clouds; any routed OCI or Kubernetes ranges must avoid overlap with those external networks.
- When adding a new extension-backed platform, verify both the config schema and the extension contract.
- For ExaCS, decide infrastructure placement, database service model, AVMC/VMC placement, and Autonomous project tiers before writing config. Shared-only ExaCS uses `shared_platforms.exacs` with `network`; hybrid uses infrastructure-only `shared_platforms.exacs` plus environment `platforms.exacs` with `network`; dedicated uses only environment `platforms.exacs` with `network`.
- For customer deployment guidance, Prefer Terraform CLI locally or from customer-controlled CI/CD. If ORM is used, stage the generated files in a customer-controlled private OCI Object Storage bucket or approved private GitHub source and use the orchestrator `rms-facade` workflow instead of repo-hosted public raw URLs.
- If the requested resource is not supported by config mode, say so clearly. Keep it out of generated files, use config mode only for adjacent supported items such as CIDRs, VCNs, subnets, DRG attachments, route tables, security rules, DNS, logging, or IAM, and provide separate manual post-deployment steps for the unsupported resource.

## Verification

- Run `bash gen/generate.sh --config <config_file> [output_dir]` for normal config-mode generation.
- When validating a customer config, point generation at a separate output directory such as a temp directory or customer-approved working directory rather than a repo test fixture path.
- If you need raw multi-output behavior without formatting, run `jsonnet --multi <output_dir>/ --tla-code-file config=<config_file> gen/landing_zone_multi.jsonnet`.
- Compare generated files with the expected output set from `gen/landing_zone_multi.jsonnet`: `network.json` and common domain outputs are always emitted, `network_pre.json` is emitted only for staged hubs, and `network_backends.json` plus extension outputs remain conditional.

## References

- For the schema and behavior map, read `references/schema-and-behavior.md`.
- For starter patterns and repo-native examples, read `references/examples.md`.
- For config-driven OKE semantics and CIDR guardrails, read `gen/workload-extensions/oke/AGENTS.md`.
- For config-driven ExaCS placement and component semantics, read `gen/workload-extensions/exacs/AGENTS.md`.

## Common Mistakes

- Editing generated JSON and forgetting to fix the config or Jsonnet source.
- Dropping customer configs or generated landing zone outputs into `tests/gen/testdata/...` just because those directories already exist.
- Assuming every platform can auto-generate subnets. Plain platforms without an extension cannot.
- Forgetting that only environments with `shared_project_network` become spokes.
- Treating ExaCS network as optional. Network means AVMC/VMC placement; infrastructure-only ExaCS must omit network.
- Adding ExaCS `project_db_compartments` for regular Exadata Database Service-only designs.
- Forgetting that omitted `security_targets` now means all environments. Narrow it explicitly when you need a subset.
- Adding an extension `type` in config without registering it in `gen/landing_zone.libsonnet`.
- Representing unsupported resources such as VPN or FastConnect by inventing config fields instead of marking them as manual post-deployment configuration.
