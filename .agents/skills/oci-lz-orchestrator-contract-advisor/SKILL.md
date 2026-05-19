---
name: oci-lz-orchestrator-contract-advisor
description: Use only when verifying or troubleshooting OCI Landing Zone Orchestrator contract/runtime behavior such as rms-facade source settings, dependency and output files, stack sequencing, duplicate top-level configuration collisions, provider or Resource Manager failures, supported root variables, or version drift. Do not use for customer discovery, landing-zone design, config authoring, blueprint selection, or workload-extension generation.
---

# OCI LZ Orchestrator Contract Advisor

## Overview

Use this skill for contract/runtime troubleshooting around `terraform-oci-modules-orchestrator` and OCI Resource Manager `rms-facade`. It is a verifier, not a builder.

Use the existing repo workflows first when the request is about design or generation:

- Customer discovery and deployment recommendations: use `landing-zone-customer-guidance`.
- Config-mode authoring or review: use `landing-zone-config`.
- Extension-specific generator semantics: use the relevant guide under `gen/workload-extensions/<extension>/`.

Do not use this skill for customer discovery, landing-zone design, config generation, ExaDB-C@C / ExaCC generation, or blueprint selection.

## Workflow

1. Classify the issue as one of: supported root family, dependency input, output file, `rms-facade` source setting, stack boundary, duplicate top-level config collision, provider/RMS failure, or version drift.
2. Inspect the active source before answering. Prefer the pinned Orchestrator ref selected by the deployment; use a local checkout only for local configs, local changes, or failing local runs.
3. Verify exact names from code, not memory: `variables.tf`, `outputs.tf`, `rms-facade/variables.tf`, `rms-facade/get_configurations.tf`, `rms-facade/get_dependencies.tf`, and `rms-facade/schema.yml`.
4. Keep configuration files, dependency files, output files, and Resource Manager source fields separate in the answer.
5. Report evidence by level: design coherence, JSON syntax, Orchestrator contract, Terraform validate, Terraform plan, apply/runtime.

## References

- Read `references/orchestrator.md` for root contract checks, output/dependency names, and version-drift handling.
- Read `references/rms-ui-and-sources.md` for Resource Manager source settings and output persistence.
- Read `references/multistack-and-config-collisions.md` for multi-stack boundaries and duplicate root-key behavior.

## Guardrails

- Do not invent root families such as native ExaCC or ExaCS families unless the active `variables.tf` proves they exist.
- Do not imply duplicate top-level families across config files are deep-merged; verify CLI or `rms-facade` behavior.
- Do not present custom manifest/profile files as Orchestrator inputs.
- Do not recommend public raw URLs as a default deployment source for customer artifacts.
