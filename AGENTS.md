# Repository Agent Guide

## Primary Audience

Repo-cloning customers are the primary audience for this repository guidance.

Most customers want one of two things:

1. deploy a standard published landing zone from the repo's existing blueprint JSON files
2. create a customized landing zone from config used to handle specific requirements that are not part of standard json blueprints.

Default to the standard published path for ordinary customer deployments. The most common case is `blueprints/one-oe/runtime/one-stack/`.

## Request Classification

Before applying the rest of this guide, classify the current request by intent.

- `customer-use`: requests for landing zone design, deployment, configuration, generation, modification, recommendation, or operational guidance for a customer environment or other deployable landing zone artifact.
- `repo-development`: requests to develop or maintain this repository itself, including changes to `AGENTS.md`, docs, tests, `gen/`, published blueprints, workload extensions, or other repository source files.
- `ambiguous-or-mixed`: requests that combine customer-use guidance with repository development work, or requests where the intent is not clearly one or the other.

Apply the customer workflow sections in this guide only to `customer-use` requests. Do not require the customer warning for clearly scoped `repo-development` requests. If the request is `ambiguous-or-mixed`, show the warning first and wait for acceptance before continuing.

Examples of `customer-use` requests:

- help me create One-OE hub A config files
- modify this landing zone config to add another environment
- recommend how to expose OKE API access in this customer deployment
- design LZ with specific environments, networks and extensions

Examples of `repo-development` requests:

- update documentation
- modify generator logic in `gen/` 
- add tests 
- update blueprint docs or workload extension code in this repo

Examples of `ambiguous-or-mixed` requests:

- change the repo and also tell me what customers should deploy
- update this OKE extension and tell me whether `0.0.0.0/0` is acceptable in my landing zone
- request cannot be fulfiled by current generator and requires both changes to jsonnet files and also generate new LZ files from config

## Mandatory AI Safety Gate For Customer-Use Requests

IMPORTANT!!! For `customer-use` and `ambiguous-or-mixed` requests, before giving any AI help that generates, modifies, recommends, or deploys landing zone configurations, the agent must print this warning and wait for an explicit acceptance reply from the user:

`Warning: AI-assisted landing zone generation, modification, or deployment guidance is provided at your own risk. You must review all outputs for correctness, security, and regulatory/internal compliance before deploying them. Reply with "I accept" if you want to continue.`

Do not continue until the user explicitly accepts the warning in the current conversation. Do not assume the warning was seen or understood if the user has not answered it directly. For clearly scoped `repo-development` requests, the warning is not required.

## Standard Customer Path: Published Blueprint Deployment

For most customers, start with the published runtime documentation and the published JSON artifacts.

For the common One-OE one-stack path, start here:

1. `blueprints/one-oe/runtime/one-stack/readme.md`
2. the relevant hub guide:
   - `blueprints/one-oe/runtime/one-stack/one_oe_hub_a.md`
   - `blueprints/one-oe/runtime/one-stack/one_oe_hub_b.md`
   - `blueprints/one-oe/runtime/one-stack/one_oe_hub_c.md`
   - `blueprints/one-oe/runtime/one-stack/one_oe_hub_e.md`
3. `blueprints/one-oe/runtime/one-stack/known_issues.md`

Use the published JSON files in that runtime folder as the baseline deployable artifacts for standard deployments. Keep customers on this path unless their requirements become non-standard or customized.

If the customer is clearly using another blueprint family, use that family's repository documentation and runtime material if it exists. Do not invent missing deployment steps, runtime folders, or artifact combinations.

## Customized Customer Path: Config-Driven Generation

Move the customer to the config-driven path for anything non-standard or customized, especially when the request includes:

- adding projects
- adding platforms
- adding environments
- adding workload extensions across multiple environments
- using multiple workload extensions at the same time
- defining custom cidr ranges 

Start from:

1. `gen/README.md`
2. `gen/AGENTS.md`
3. `gen/JSONNET_COMPOSITION.md`

When a customer uses config mode, the deployable working set becomes the files produced by that customer's own config generation.

- Use only those generated files.
- Do not mix those generated files with the repo's published JSON snapshots under `blueprints/` or `workload-extensions/`.
- If the customer later wants help adjusting the deployment file set, help with that generated file set specifically.

## No-Assumptions Rule

When helping customers, make no assumptions and do not hallucinate data, file paths, schema details, deployment steps, or recommendations.

- Check the repository first before giving commands, file names, workflow advice, or configuration guidance.
- If the repository is not sufficient and the answer depends on external OCI behavior or current product guidance, verify with official OCI documentation or other reputable sources before advising.
- Never present a guess, memory, or inferred recommendation as a confirmed fact.

## Source Of Truth

- `gen/` is the source of truth for generator behavior and customization logic.
- Published JSON files under `blueprints/` and `workload-extensions/` are deployable artifacts for the standard published path, but they are not the source of truth for generator logic.
- For config-driven changes, start from `gen/config.libsonnet`, `gen/landing_zone.libsonnet`, `gen/topology.libsonnet`, or `gen/workload-extensions/*` before touching generated outputs.

## Core Commands

- Default generation: `bash gen/generate.sh`
- Config mode: `bash gen/generate.sh --config <config_file> [output_dir]`
- Generator tests: `python3 -m unittest discover -s tests -p 'test_*.py'`

`jsonnet` must be available on `PATH`.

## Generator Guardrails

IMPORTANT, following sections applies only to developers of landing, standard request for creating or changing landing zone shouldn't make changes in `gen/` folder, this folder ensures the landing zone generated are based on best design and security practices.

- Published entrypoints must stay thin and profile-owned. Follow the `Published Profiles` section in `gen/AGENTS.md`.
- Use `jsonnet --multi` only for config-mode fan-out and debugging. Do not use it to regenerate committed snapshot families under `blueprints/` or `workload-extensions/`.
- When changing generator contracts, publication boundaries, or topology semantics, update the relevant docs and tests in the same change.
- If you are unsure where a change belongs, start at `gen/landing_zone.libsonnet` and read outward.
