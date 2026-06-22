# Repository Agent Guide

## Primary Audience

Repo-cloning customers are the primary audience for this repository guidance.

Most customers want one of two things:

1. deploy a standard published landing zone from the repo's existing blueprint JSON files
2. create a customized landing zone from config used to handle specific requirements that are not part of standard json blueprints.

Default to the standard published path for ordinary customer deployments. The most common case is `blueprints/one-oe/runtime/one-stack/`.

## Local Instruction Ownership

Use this file as the canonical policy source for request classification, the customer warning, discovery order, unsupported requirements, artifact placement, deployment defaults, and repository source-of-truth rules. Nested `AGENTS.md` files and repo-local skills should add local workflow or contract detail, not replace these rules.

- `.agents/skills/landing-zone-customer-guidance/SKILL.md`: customer conversation workflow and short activation reminders.
- `.agents/skills/landing-zone-config/SKILL.md`: config-mode authoring and verification workflow.
- `gen/AGENTS.md`: generator architecture, publication boundaries, schema behavior, extension contracts, and code style.
- `gen/workload-extensions/*/AGENTS.md`: extension-specific contracts, source files, discovery addenda, and tests.

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
- request cannot be fulfilled by current generator and requires both changes to jsonnet files and generated LZ files from config

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

## Mandatory Unsupported Requirement Handling

For `customer-use` and `ambiguous-or-mixed` requests, if the customer asks for a resource, service, topology, or behavior that is not supported by the current Landing Zone framework, published artifacts, config schema, or workload extensions:

- Clearly state that the request is not supported by the Landing Zone framework today. Do not imply that unsupported resources can be generated by adding ad hoc config keys, editing generated JSON, or mixing in unpublished files.
- Continue to use the Landing Zone framework only for the parts it supports. Keep unsupported resources out of generated landing zone artifacts unless the repository source of truth explicitly supports them.
- Clearly mark the unsupported part as a required post-deployment manual configuration step. Use wording such as "Manual post-deployment configuration required" so the boundary is unmistakable.
- Provide manual configuration steps for the unsupported requirement after the landing zone is created. Keep these steps separate from generated-config steps and explain that the customer owns lifecycle, drift management, and compliance review for the manual resources.
- Where possible, configure supported landing zone prerequisites to reduce manual work. Examples include CIDR allocation, compartments, VCNs, subnets, DRG attachments, route tables, security rules, DNS, logging, or IAM policies when those items are already supported by the selected path.
- Do not promise that the framework fully configures the unsupported resource just because it can prepare adjacent resources such as routing or compartments.
- If the unsupported requirement is network connectivity such as Site-to-Site VPN, FastConnect, or another external connectivity pattern, first verify what the selected published path or config-driven generator can emit. If the connectivity resource itself is unsupported, make that explicit, then configure only supported prerequisites such as non-overlapping CIDRs, DRG-ready topology, DRG attachments, and route-table entries where the framework supports them. The customer must manually create and validate the unsupported connectivity resource, such as CPE objects, IPSec tunnels, BGP/static routing settings, provider cross-connects, or service-specific attachments.
- When giving manual steps, consult the relevant repository guide first and use official OCI documentation when the steps depend on OCI service behavior that is not defined in this repo.

## Mandatory Customer Artifact Placement

For `customer-use` and `ambiguous-or-mixed` requests, before creating config-mode source files or generated landing zone outputs:

- Ask where the customer wants the source config files to live.
- Ask where the generated landing zone file set should be written.
- Keep the config source location and generated output location explicit and separate.
- Do not default customer artifacts into `tests/`, test fixtures, or other repo validation paths. Use those only for clearly scoped `repo-development` work that is explicitly about tests or fixtures.

## Mandatory Customer Discovery Sequence

For `customer-use` and `ambiguous-or-mixed` requests, do not jump directly to workload-extension, deployment, or configuration options after the warning is accepted. First establish the customer's landing zone design inputs, extension and network scope, and CIDR inputs in the following order.

If any item below is still unknown, ask for it before continuing. Do not skip ahead and do not recommend OKE deployment paths, published JSON artifacts, or config-mode files until this sequence is complete.
The list below defines the decision order. It is not a customer-facing bulk questionnaire. If multiple items are unknown, handle them across separate turns.

1. **Landing zone baseline**
   - Always use `One-OE` as the landing zone family for customer-use guidance in this repository.
   - Do not ask who will operate the landing zone or whether the customer has one or several operating entities.
   - Do not ask the customer to choose a landing zone family before continuing discovery.
   - Explain briefly that this guidance uses the current One-OE baseline, then move to the region question.
   - Do not assume the customer should start from a workload extension before the One-OE baseline is established.

2. **Region and realm**
   - Determine the OCI region where the landing zone will be deployed.
   - Explain that the region is the deployment location, such as `eu-frankfurt-1`, while the realm is the isolated OCI cloud boundary, such as `oc1` for public cloud or `oc19` for EU Sovereign Cloud.
   - Default the realm to `oc1` if the customer does not provide one.
   - Ask for the realm explicitly only when the customer mentions sovereign, government, dedicated, isolated, Alloy, or another non-public OCI deployment, or when the selected region maps to a non-`oc1` realm.
   - If the customer does not know the realm, help infer it from the selected region only after checking repository or official OCI region/realm data.
   - For config mode, keep `region` and `region_short_name` paired; omit `realm` or set it to `oc1` for public-cloud deployments, and set it explicitly for non-`oc1` deployments.

3. **Environment count and names**
   - Determine how many environments the landing zone needs and what they are called.
   - Ask which environments are needed, using examples such as development, test, preproduction, and production when helpful.
   - Keep the environment names explicit. Do not assume only `prod` and `preprod` unless the customer confirms the standard One-OE shape fits.

4. **Application and workload structure**
   - Determine which applications or workloads are going to run in the landing zone.
   - OKE can itself be the workload or platform the customer is asking for.
   - Ask what will run on top of OKE and whether any other non-OKE workloads must also be part of the landing zone.
   - Introduce repo terms such as `platform` and `project` only if they are needed to explain a design choice. Do not make the customer choose those constructs before their workload shape is understood.
   - Use this information to decide whether projects are needed, not to imply that projects are mandatory.
   - If the customer only needs OKE and no additional workload/project structure, do not force a project-based recommendation.
   - Do not treat an application as a single OCI service such as one VM or one Oracle Function.
   - Treat an application as a business workload that is commonly composed of multiple services that together solve a business need.

5. **Firewall requirement**
   - Determine whether the landing zone must include a firewall.
   - Ask this in customer language: whether the deployment is production and whether inspected or tightly controlled traffic flow is required.
   - Explain that a firewall-based design is recommended for both production and non-production, but it is mandatory for production.
   - For non-production, explain that omitting the firewall is a conscious tradeoff in favor of simplicity or lower cost, not the preferred default.
   - Any production deployment must be treated as firewall-required.
   - Do not recommend a no-firewall hub for production use.

6. **Hub model selection**
   - Choose the hub model only after the firewall requirement is known.
   - Do not ask the customer to pick `Hub A`, `Hub B`, `Hub C`, or `Hub E` by label alone.
   - After the firewall need is known, explain the relevant hub options in plain language, recommend the best fit, and only then confirm the hub family.
   - For firewalled designs, guide the customer to the appropriate hub family before discussing workload details.
   - Before recommending public ingress, load balancer changes, or OKE exposure patterns for the chosen hub family, inspect the relevant hub guide, published runtime artifacts, or config-driven hub builder first. Do not assume the selected hub lacks a public load balancer pattern or needs a new public edge design without checking what the repo already provides.
   - Do not present `Hub E` or any other no-firewall hub as the default simply because the deployment is non-production.
   - Recommend a no-firewall hub only when the customer explicitly accepts the tradeoff, or when the request is clearly PoC, lab, or cost/simplicity driven.
   - Reserve `Hub E` for PoC, lab, or explicitly non-production cases where a no-firewall design is acceptable.

7. **Extension and network scope sizing**
   - Determine which applications, platforms, and workload extensions will need network resources or other CIDR-bearing ranges before proposing concrete CIDRs or asking the customer for final CIDR values.
   - For network-producing workload extensions, identify every VCN/subnet-producing or CIDR-bearing scope the selected path will actually emit, including hub VCNs, spoke VCNs, platform VCNs, extension VCNs, Kubernetes service CIDRs, Kubernetes pod ranges, or any other routed or internal ranges defined by the selected extension contract.
   - Use the selected workload extension's local guide under `gen/workload-extensions/*/AGENTS.md` to decide which placement, component, and sizing questions must be answered before CIDR allocation.
   - Ask for rough scale and growth expectations only where they affect address planning, such as VM count, cluster count, node count, pod density, database network scope, environment count, expected subnet growth, and future environments or workloads that need reserved address space.
   - Do not reserve CIDRs for unchosen extension placement branches. Allocate only for the network scopes the selected design will emit, plus deliberate future reserves that are explained to the customer.
   - If a selected extension or placement scope is networkless, infrastructure-only, or otherwise forbidden from emitting network resources, do not assign it a VCN or subnet CIDR.

8. **CIDR allocation**
   - Determine the concrete OCI CIDR plan for the hub, spoke, platform, and selected workload-extension networks before giving deployment or config guidance.
   - Explain CIDRs as the network ranges reserved for OCI VCNs and subnets before asking the customer for numbers.
   - CIDR allocations are difficult to change later. Before recommending a split, explain the reasoning behind each block size, which network scope it serves, which sizing input drove it, and where intentional reserve space is left.
   - Ask whether the landing zone must connect to on-premises networks or other clouds before proposing CIDRs.
   - Explain that OCI VCN and subnet CIDRs that need routed connectivity to on-premises or other clouds must not overlap with those external network ranges.
   - Before proposing concrete CIDRs, confirm that network-producing workload-extension scope and sizing are already known.
   - Distinguish OCI VCN/subnet CIDRs from Kubernetes-internal CIDRs such as services and, depending on the pod networking model, pods.
   - For OKE guidance, explicitly explain whether pod and service CIDRs must come from the customer's OCI-allocated range or only need to avoid overlap with it.
   - When OKE networking must coexist with connected on-premises or multi-cloud ranges, explain the overlap constraints for pod and service CIDRs as well instead of treating them as isolated defaults.
   - Never silently place OKE pod or service CIDRs outside a customer-provided OCI CIDR allocation without explaining why.
   - If the customer has not defined CIDRs yet, help them decide the allocation first.
   - If repository behavior and official OCI documentation appear inconsistent for OKE networking, say so and verify with official OCI docs before advising.

Only after these eight decisions are known may the agent continue with:

- recommending the standard published path versus the config-driven path
- explaining OKE deployment options such as single-stack, multi-stack, or config-driven `oke_simple`
- generating or modifying landing zone guidance, configs, or deployment steps

## Mandatory ExaDB-D / ExaCS Discovery Addendum

For `customer-use` and `ambiguous-or-mixed` requests that include ExaDB-D, Exadata Database Service on Dedicated Infrastructure, Autonomous Database Dedicated, ExaCS, VMCs, or AVMCs, complete these extra discovery decisions before CIDR allocation and before creating or modifying config-mode artifacts. Ask them one at a time in customer language after the base landing-zone decisions above are known.

1. **Exadata infrastructure placement**
   - Determine whether the Exadata infrastructure is shared across environments or dedicated per environment.
   - Explain that shared infrastructure maps to a shared platform scope, while per-environment infrastructure maps to environment platform scopes.
   - If the customer chooses shared infrastructure only, do not create environment ExaCS platforms just to mirror the shared platform.

2. **Database service model**
   - Determine whether the customer will use Autonomous Database Dedicated on AVMCs, regular Exadata Database Service on VMCs, or both.
   - Explain that Autonomous Database Dedicated needs AVMC placement and may need project-level Autonomous Database tiers, while regular Exadata Database Service uses VMC placement and does not need project DB tiers.
   - Do not add `project_db_compartments` for regular Exadata Database Service-only designs.

3. **AVMC/VMC placement**
   - Determine whether AVMCs or VMCs are shared with the Exadata infrastructure or dedicated per environment.
   - Explain that AVMC/VMC placement requires an ExaCS platform network with database and backup subnets. The Exadata infrastructure-only scope does not require that network.
   - If shared infrastructure has no network, treat that shared platform as infrastructure-only. Do not grant AVMC/VMC permissions or create AVMC/VMC observability for that scope.

4. **Autonomous project tiers**
   - If Autonomous Database Dedicated will be used, determine which environments and projects need Autonomous Database project tiers.
   - Explain that each selected project needs a project DB compartment. A separate project/spoke network is only needed when applications or other project resources such as VMs must be deployed in that project and connect to the Autonomous Database.
   - In config terms, this means `project_db_compartments` only for selected projects. Define `shared_project_network` only for environments that need project network resources.

Use the existing config contract for these outcomes:

- Shared infrastructure plus shared AVMC/VMC: only `shared_platforms.exacs`, with `network`.
- Shared infrastructure plus environment-specific AVMC/VMC: `shared_platforms.exacs` without `network`, and `environments.<env>.platforms.exacs` with `network`.
- Environment-specific infrastructure plus environment-specific AVMC/VMC: only `environments.<env>.platforms.exacs`, with `network`.
- Autonomous Dedicated project tiers: set `project_db_compartments` only for selected projects.
- Regular Exadata Database Service only: omit `project_db_compartments`.
- Infrastructure-only ExaCS scope: omit `network`.

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
- defining custom CIDR ranges

Do not move the customer to config mode merely to represent a resource that the config schema and generator do not support. For unsupported requirements, use config mode only for the supported landing zone prerequisites and document the unsupported resource as manual post-deployment configuration.

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
- If online search or external documentation conflicts with this repository, give the repository's recommendations and source-of-truth files slightly higher priority for what this landing zone framework supports. State the conflict clearly instead of silently replacing repo guidance with external guidance.
- Do not infer OKE pod or service CIDR behavior from examples that predate the current OKE networking contract or generic defaults. Verify the selected OKE networking mode with current official OCI documentation before making CIDR recommendations.
- For OKE-specific generator semantics and CIDR planning in config mode, consult `gen/workload-extensions/oke/AGENTS.md` before recommending a deployable config or exact CIDR split.
- Never present a guess, memory, or inferred recommendation as a confirmed fact.

## Source Of Truth

- `gen/` is the source of truth for generator behavior and customization logic.
- `terraform-oci-modules-orchestrator` is the source of truth for how generated configuration files are interpreted at deployment time. When a generated field seems unused, transformed, or contradictory, inspect the orchestrator and the downstream modules it invokes before changing this repo's contract. For published OKE behavior, inspect the exact orchestrator tag referenced by the published OKE docs.
- `gen/workload-extensions/oke/AGENTS.md` plus `gen/workload-extensions/oke/simple/*` are the source of truth for config-driven `oke_simple` behavior and OKE-native networking semantics in this repo.
- `gen/workload-extensions/exacs/AGENTS.md` plus `gen/workload-extensions/exacs/*` are the source of truth for config-driven ExaDB-D / ExaCS placement, component, network, and project DB tier semantics in this repo.
- The ExaDB-C@C generator guide under `gen/workload-extensions/exacc/` plus the source files in that directory are the source of truth for config-driven ExaDB-C@C IAM, observability, notification email, and publication semantics in this repo.
- Published JSON files under `blueprints/` and `workload-extensions/` are deployable artifacts for the standard published path, but they are not the source of truth for generator logic.
- For config-driven changes, start from `gen/config.libsonnet`, `gen/landing_zone.libsonnet`, `gen/topology.libsonnet`, or `gen/workload-extensions/*` before touching generated outputs.

## Core Commands

- Default generation: `bash gen/generate.sh`
- Config mode: `bash gen/generate.sh --config <config_file> [output_dir]`
- Generator tests: `python3 -m unittest discover -s tests -p 'test_*.py'`

Generation and tests need a Jsonnet renderer on `PATH`. Local scripts prefer `jrsonnet` when it is installed and fall back to `jsonnet`; CI/CD runs must use canonical `jsonnet`.

## Generator Guardrails

These guardrails apply only to `repo-development` work on the generator. Standard customer-use requests for creating or changing a deployable landing zone should not modify `gen/`; that source controls the generated landing zone design and security baseline.

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
