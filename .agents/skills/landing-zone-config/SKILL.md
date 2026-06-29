---
name: landing-zone-config
description: Use when authoring, reviewing, or debugging the config-driven OCI landing zone Jsonnet input used by `gen/generate.sh --config`, especially when adding environments, shared platforms, environment platforms, hub changes, or extension-backed network layouts.
---

# Landing Zone Config

## Overview

Use this skill when work should go through the new config-driven generator instead of editing generated JSON files directly.

Core principle: treat the landing zone config as the source of truth, then verify behavior against the generator's normalization and orchestration code before changing schema assumptions.

`AGENTS.md` remains canonical for customer safety, discovery, artifact placement, unsupported resources, and deployment defaults. If the request starts as customer design or deployment guidance and the customer path is not yet chosen, use `landing-zone-customer-guidance` first. This skill starts after the conversation has reached the config-driven path or the user explicitly asks for config-mode details.

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
4. Ask for the target OCI region before authoring customer config. Default `realm` to `oc1` when it is not provided, and set `realm` explicitly for non-`oc1` deployments such as `oc19`.
5. Keep only the smallest top-level shape first: `hub` and non-empty `environments`, plus region values when the customer has provided them and realm only when needed.
6. Add environments and platforms incrementally, then run config mode and inspect the generated outputs.
7. When behavior is unclear, prefer reading the normalization and extension code over guessing from checked-in JSON.
8. If the question is about Orchestrator runtime behavior, dependency files, output files, Resource Manager source settings, or duplicate top-level configuration collisions, use `oci-lz-orchestrator-contract-advisor` as a supporting verifier rather than expanding this skill into runtime troubleshooting.

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
| Realm | `realm` is optional and defaults to `oc1`, including when explicitly set to `null`; supported config realms are `oc1` and `oc19`. |
| CIS level | `cis_level` is optional and defaults to `2`; set `1` to emit CIS level 1 security/observability files instead. |
| Extensions | Extension `type` must be registered in `gen/landing_zone.libsonnet`. |
| Config-mode network outputs | `network.json` is canonical final output; `network_pre.json` appears only for staged hubs. |
| RPC config | For explicit RPC/remote-peering requests, model peering under top-level `remote_peering_connections`; collect remote CIDRs, peer region, role, peer RPC reference for requestor sides, and cross-tenancy requestor tenancy/group OCIDs. |
| Artifact placement | Ask for both the config file location and the output directory before creating customer artifacts; do not default them into `tests/`. |
| Unsupported resources | Do not add unsupported config keys or fake extension types. Generate only supported prerequisites, then document the unsupported resource as manual post-deployment configuration. |
| Networked extension CIDRs | Include CIDRs only for network scopes the selected config will emit; do not allocate for unchosen optional placement branches or networkless/infrastructure-only scopes. |
| ExaCS network | Network is required for ExaCS AVMC/VMC placement and forbidden for ExaCS infrastructure-only placement. |
| ExaCS project DB tiers | Use `project_db_compartments` only for Autonomous Database Dedicated project tiers; `shared_project_network` is only needed when the environment also needs project network resources. |

## Authoring Guidance

- Prefer one small config file per scenario and compose from imports if reuse is needed.
- For customer-use work, keep config sources and generated outputs in customer-chosen or explicitly approved working directories. Reserve `tests/gen/testdata/...` for repo-development fixtures and automated tests, not customer artifact placement.
- Use `shared_project_network` only for environments that should produce spoke VCN outputs.
- Put environment-scoped platforms under `environments.<env>.platforms`.
- Put shared platforms under top-level `shared_platforms`.
- Keep CIDRs explicit even when subnets are auto-generated. Auto-subnetting helps with subnet layout, not top-level network planning.
- Resolve network-producing extension scope and sizing before CIDR allocation; make any deliberate reserved space explicit in the customer-facing rationale.
- When selecting CIDRs, check whether the landing zone will connect to on-premises or other clouds; any routed OCI or Kubernetes ranges must avoid overlap with those external networks.
- When adding a new extension-backed platform, verify both the config schema and the extension contract.
- For OKE, read `gen/workload-extensions/oke/AGENTS.md` before giving exact CIDR splits or networking contract guidance.
- For ExaCS, complete the placement decisions in `AGENTS.md`, then use `gen/workload-extensions/exacs/AGENTS.md` for the config mapping.
- For ExaDB-C@C, complete the placement decisions in `AGENTS.md`, then use the generator guide under `gen/workload-extensions/exacc/` for config and publication semantics.
- If a requested resource is unsupported by config mode, keep unsupported resources out of generated files and mark the separate work as "Manual post-deployment configuration required."

## Verification

- Run `bash gen/generate.sh --config <config_file> [output_dir]` for normal config-mode generation.
- When validating a customer config, point generation at a separate output directory such as a temp directory or customer-approved working directory rather than a repo test fixture path.
- If you need raw multi-output behavior without formatting, run `jsonnet --multi <output_dir>/ --tla-code-file config=<config_file> gen/landing_zone_multi.jsonnet`.
- Compare generated files with the expected output set from `gen/landing_zone_multi.jsonnet`: `network.json`, `iam.json`, `governance.json`, and the selected `security_cis*` / `observability_cis*` files are emitted; `network_pre.json` appears only for staged hubs, and `network_backends.json` plus extension outputs remain conditional.

## References

- For the schema and behavior map, read `references/schema-and-behavior.md`.
- For starter patterns and repo-native examples, read `references/examples.md`.
- For config-driven OKE semantics and CIDR guardrails, read `gen/workload-extensions/oke/AGENTS.md`.
- For config-driven ExaCS placement and component semantics, read `gen/workload-extensions/exacs/AGENTS.md`.
