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
- I want landing zone to run OKE

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

## Mandatory Customer Communication Defaults

For `customer-use` and `ambiguous-or-mixed` requests, assume the customer may have limited OCI or Landing Zone experience unless they demonstrate otherwise.

- Explain what you are recommending, why it is recommended, and the main security implications in plain language.
- Ask discovery questions one at a time. Do not present the full required discovery list as a single customer questionnaire unless the customer explicitly asks for a checklist.
- Before asking the customer to choose between repo or generator terms, explain those terms in customer language first and say why the choice matters.
- Do not ask customers to choose between labels such as `One-OE`, `Hub A`, `Hub B`, `Hub C`, `Hub E`, `platform`, `project`, `environment`, or `shared_project_network` without first explaining them in plain language and confirming they are relevant.
- Start each discovery step with a short explanation of what decision is being made, then ask only the next missing question.
- After each customer answer, briefly summarize what is now known before moving to the next discovery item.
- Prefer text explanations and simple diagrams over raw config snippets.
- Treat raw config, Jsonnet, and internal generator structures as working material, not the primary customer deliverable.
- Show intermediate config only if the customer asks for it directly or if it is necessary to unblock the discussion or verify a design.

## Mandatory Deployment Delivery Defaults

For `customer-use` and `ambiguous-or-mixed` requests, recommend secure delivery of deployable artifacts.

- Prefer Terraform CLI locally or from customer-controlled CI/CD.
- If ORM is used, stage the configuration files in a customer-controlled private OCI Object Storage bucket or approved private GitHub source and run them through the orchestrator `rms-facade` workflow.
- Do not recommend public raw GitHub or public bucket URLs as the default customer path.
- If repository runtime docs show public repo-hosted one-click ORM examples, treat them as reference material only. They are not the recommended customer deployment path.

## Mandatory Customer Artifact Placement

For `customer-use` and `ambiguous-or-mixed` requests, before creating config-mode source files or generated landing zone outputs:

- Ask where the customer wants the source config files to live.
- Ask where the generated landing zone file set should be written.
- Keep the config source location and generated output location explicit and separate.
- Do not default customer artifacts into `tests/`, test fixtures, or other repo validation paths. Use those only for clearly scoped `repo-development` work that is explicitly about tests or fixtures.

## Mandatory Customer Discovery Sequence

For `customer-use` and `ambiguous-or-mixed` requests, do not jump directly to workload-extension, deployment, or configuration options after the warning is accepted. First establish the customer's landing zone design inputs in the following order.

If any item below is still unknown, ask for it before continuing. Do not skip ahead and do not recommend OKE deployment paths, published JSON artifacts, or config-mode files until this sequence is complete.
The list below defines the decision order. It is not a customer-facing bulk questionnaire. If multiple items are unknown, handle them across separate turns.

1. **Landing zone choice**
   - First determine which landing zone family the customer is using or should use.
   - Recommend `One-OE` as the starting point for most customers unless their requirements clearly call for another blueprint family.
   - Do not open by asking the customer whether they want `One-OE` or whether they have an "operating entity".
   - First explain the concept in customer language: whether the landing zone will be run mainly by one operations team, or whether several operations teams will share responsibility inside the same tenancy.
   - Explain that labels such as department, business unit, country, or operating entity are only examples. The important distinction is not the label, but whether there are multiple operations teams with responsibilities that overlap or must be separated.
   - If one main operations team will run the landing zone, map that concept to the repo term `One-OE`.
   - If several operations teams will share responsibility in the same tenancy, explain that `Multi-OE` may be the better fit.
   - Whenever recommending `Multi-OE`, immediately warn that a single tenancy can have at most 500 IAM policy statements from the root compartment to any leaf compartment path, that this is a hard OCI limit, and include this Oracle documentation link: [Policy Statements Limit per Compartment Hierarchy](https://docs.oracle.com/en-us/iaas/Content/Identity/policymgmt/policy-limits-compartment-hierarchy.htm).
   - Do not assume the customer should start from a workload extension before the base landing zone choice is known.

2. **Environment count and names**
   - Determine how many environments the landing zone needs and what they are called.
   - Ask which environments are needed, using examples such as development, test, preproduction, and production when helpful.
   - Keep the environment names explicit. Do not assume only `prod` and `preprod` unless the customer confirms the standard One-OE shape fits.

3. **Application and workload structure**
   - Determine which applications or workloads are going to run in the landing zone.
   - OKE can itself be the workload or platform the customer is asking for.
   - Ask what will run on top of OKE and whether any other non-OKE workloads must also be part of the landing zone.
   - Introduce repo terms such as `platform` and `project` only if they are needed to explain a design choice. Do not make the customer choose those constructs before their workload shape is understood.
   - Use this information to decide whether projects are needed, not to imply that projects are mandatory.
   - If the customer only needs OKE and no additional workload/project structure, do not force a project-based recommendation.
   - Do not treat an application as a single OCI service such as one VM or one Oracle Function.
   - Treat an application as a business workload that is commonly composed of multiple services that together solve a business need.

4. **Firewall requirement**
   - Determine whether the landing zone must include a firewall.
   - Ask this in customer language: whether the deployment is production and whether inspected or tightly controlled traffic flow is required.
   - Explain that a firewall-based design is recommended for both production and non-production, but it is mandatory for production.
   - For non-production, explain that omitting the firewall is a conscious tradeoff in favor of simplicity or lower cost, not the preferred default.
   - Any production deployment must be treated as firewall-required.
   - Do not recommend a no-firewall hub for production use.

5. **Hub model selection**
   - Choose the hub model only after the firewall requirement is known.
   - Do not ask the customer to pick `Hub A`, `Hub B`, `Hub C`, or `Hub E` by label alone.
   - After the firewall need is known, explain the relevant hub options in plain language, recommend the best fit, and only then confirm the hub family.
   - For firewalled designs, guide the customer to the appropriate hub family before discussing workload details.
   - Before recommending public ingress, load balancer changes, or OKE exposure patterns for the chosen hub family, inspect the relevant hub guide, published runtime artifacts, or config-driven hub builder first. Do not assume the selected hub lacks a public load balancer pattern or needs a new public edge design without checking what the repo already provides.
   - Do not present `Hub E` or any other no-firewall hub as the default simply because the deployment is non-production.
   - Recommend a no-firewall hub only when the customer explicitly accepts the tradeoff, or when the request is clearly PoC, lab, or cost/simplicity driven.
   - Reserve `Hub E` for PoC, lab, or explicitly non-production cases where a no-firewall design is acceptable.

6. **CIDR allocation**
   - Determine the OCI CIDR plan for the hub, spoke, and platform networks before giving concrete deployment or config guidance.
   - Explain CIDRs as the network ranges reserved for OCI VCNs and subnets before asking the customer for numbers.
   - Ask whether the landing zone must connect to on-premises networks or other clouds before proposing CIDRs.
   - Explain that OCI VCN and subnet CIDRs that need routed connectivity to on-premises or other clouds must not overlap with those external network ranges.
   - Distinguish OCI VCN/subnet CIDRs from Kubernetes-internal CIDRs such as services and, depending on the pod networking model, pods.
   - For OKE guidance, explicitly explain whether pod and service CIDRs must come from the customer's OCI-allocated range or only need to avoid overlap with it.
   - When OKE networking must coexist with connected on-premises or multi-cloud ranges, explain the overlap constraints for pod and service CIDRs as well instead of treating them as isolated defaults.
   - Never silently place OKE pod or service CIDRs outside a customer-provided OCI CIDR allocation without explaining why.
   - If the customer has not defined CIDRs yet, help them decide the allocation first.
   - If repository behavior and official OCI documentation appear inconsistent for OKE networking, say so and verify with official OCI docs before advising.

Only after these six decisions are known may the agent continue with:

- recommending the standard published path versus the config-driven path
- explaining OKE deployment options such as single-stack, multi-stack, or config-driven `oke_simple`
- generating or modifying landing zone guidance, configs, or deployment steps

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

Use this published path only after the discovery sequence confirms that the customer's landing zone choice, environments, firewall posture, hub model, and CIDR plan fit the standard published shape.

Check the selected hub guide before recommending public ingress or extra load balancer layers. In the One-OE one-stack runtime material, each hub guide already includes a public load balancer example with placeholder backend targets that must be replaced with the customer's real workload endpoints. If a workload such as OKE exposes a private or internal load balancer, explain that the existing hub public load balancer can target that private endpoint when the design allows it instead of assuming a second public ingress layer is required.

When helping customers deploy those published artifacts, keep the secure delivery defaults above. Do not default to repo-hosted public raw URL feeds just because a runtime guide shows a convenience button for them.

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
- Before creating a config file or generated landing zone output, follow the artifact placement defaults above and ask where those files should live.
- Prefer Terraform CLI locally or from customer-controlled CI/CD for deploying that generated file set.
- If ORM is used for generated files, stage them in a customer-controlled private OCI Object Storage bucket or approved private GitHub source instead of using repo-hosted public raw URLs.
- Remember that those generated configs are deployed through `terraform-oci-modules-orchestrator`. When deep-dive debugging or deployment-behavior investigation is needed, inspect the orchestrator contract and its downstream module wiring in addition to this repo. For published OKE flows, follow the exact orchestrator tag referenced by the published OKE docs instead of inspecting `HEAD`.
- Do not assume OKE requires `projects`.
- Do not assume an environment requires `shared_project_network`; use it only when the desired topology needs a spoke/projects VCN.
- Verify generator behavior before telling customers that a config must include `projects` or `shared_project_network`.

## No-Assumptions Rule

When helping customers, make no assumptions and do not hallucinate data, file paths, schema details, deployment steps, or recommendations.

- Check the repository first before giving commands, file names, workflow advice, or configuration guidance.
- When the question is about public exposure, ingress, or load balancing, inspect the selected hub guide, published runtime artifact, or config-driven hub builder before advising. Never assume a hub model lacks a public load balancer pattern or needs an extra public edge layer without checking the repo first.
- If the repository is not sufficient and the answer depends on external OCI behavior or current product guidance, verify with official OCI documentation or other reputable sources before advising.
- Do not infer OKE pod or service CIDR behavior from examples that predate the current OKE networking contract or generic defaults. Verify the selected OKE networking mode with current official OCI documentation before making CIDR recommendations.
- For OKE-specific generator semantics and CIDR planning in config mode, consult `gen/workload-extensions/oke/AGENTS.md` before recommending a deployable config or exact CIDR split.
- Never present a guess, memory, or inferred recommendation as a confirmed fact.

## Source Of Truth

- `gen/` is the source of truth for generator behavior and customization logic.
- `terraform-oci-modules-orchestrator` is the source of truth for how generated configuration files are interpreted at deployment time. When a generated field seems unused, transformed, or contradictory, inspect the orchestrator and the downstream modules it invokes before changing this repo's contract. For published OKE behavior, inspect the exact orchestrator tag referenced by the published OKE docs.
- `gen/workload-extensions/oke/AGENTS.md` plus `gen/workload-extensions/oke/simple/*` are the source of truth for config-driven `oke_simple` behavior and OKE-native networking semantics in this repo.
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

## Generator Error-Handling Policy

For repo-development work in `gen/`, prefer boundary-only error handling that keeps the generator readable and relies on Jsonnet's native failures for trusted internal misuse.

- Keep explicit custom validation at public boundaries: config input normalization, extension metadata/render contracts, CIDR/subnet/network invariants, and workload-extension parameters that customers author directly.
- Centralize reusable shape checks in `gen/lib/validation.libsonnet` instead of repeating `std.objectHas`, `std.type`, missing-field, array, allowed-key, and string-array checks at each call site.
- Keep domain validators such as `gen/lib/cidrs.libsonnet` and `gen/lib/subnets.libsonnet` explicit, because overlap, containment, canonical CIDR, and required subnet-key failures need clear customer-facing messages.
- Do not add defensive custom asserts inside helpers that only receive normalized data from the generator itself unless the native Jsonnet error would be misleading or would hide a security/network invariant.
- Add or keep custom errors only when they improve customer-facing diagnosis, prevent a late confusing failure, or protect a deployable contract. Otherwise let Jsonnet fail naturally.
- Tests should pin stable boundary messages with focused fail fixtures. Prefer `// error_contains:` for brittle Jsonnet stack output, and avoid tests that only preserve internal defensive boilerplate.
