---
name: landing-zone-customer-guidance
description: Use when handling customer-facing OCI landing zone design or deployment questions, especially when the customer describes an outcome such as running OKE and may not know repo terms such as One-OE, hub families, environments, projects, or platforms.
---

# Landing Zone Customer Guidance

## Overview

Use this skill before recommending repo paths, blueprints, or config files for customer-use landing zone requests.

Core principle: guide the customer through the required design decisions one at a time in plain language, then map the answers back to repo terminology only after the customer understands the choice being made.

## When to Use

- A customer asks for landing zone design, deployment, or recommendation help
- The request is outcome-first, such as "I want landing zone to run OKE"
- The customer may not know repo or generator terms
- You need to determine whether the standard published path or the config-driven path fits

Do not use this skill for repo-development work. Once the request is clearly on the config-driven path and the customer decisions are already known, switch to `landing-zone-config`.

## Workflow

1. For `customer-use` and `ambiguous-or-mixed` requests, show the warning from `AGENTS.md` and wait for explicit acceptance.
2. After acceptance, give one short orientation sentence and ask only the first missing question.
3. Follow the discovery order from `AGENTS.md`. The six items are a decision sequence, not a single questionnaire.
4. Before asking the customer to choose between repo labels, explain those options in customer language and recommend a default when the repo has one.
5. After each answer, summarize what is now known in one sentence, then ask the next missing question.
6. After the hub family is known and before discussing public exposure, load balancers, or OKE ingress, inspect the matching hub guide or runtime artifacts first so you know what load balancer pattern already exists.
7. Only after all required decisions are known may you recommend a published runtime path, a workload extension path, or config-mode generation.
8. When deployment execution comes up, Prefer Terraform CLI locally or from customer-controlled CI/CD. If ORM is used, stage the files in a customer-controlled private OCI Object Storage bucket or approved private GitHub source and use the orchestrator `rms-facade` workflow. Do not recommend public raw GitHub or public bucket URLs as the default customer path.

## Question Pattern

| Decision | Ask it like this | Avoid this |
|---|---|---|
| Landing zone choice | Explain that the first distinction is whether one main operations team will run the landing zone, or whether several operations teams will share responsibility inside the same tenancy. Explain that names such as department, business unit, country, or operating entity are just examples. If several teams have overlapping or clearly separated responsibilities, explain that the landing zone shape may need to reflect that. Then ask which operations model fits the customer. | "Are you using `One-OE`?" |
| Environment count | Ask how many environments the landing zone needs and what each environment should be called, using examples such as development, test, preproduction, or production when helpful. | Asking for names before explaining that environments are the separate deployment areas such as development, test, preproduction, or production. |
| Workload structure | Ask what business applications will run on Kubernetes and whether anything outside Kubernetes must also live in the landing zone. | "Do you need `projects` and `platforms`?" |
| Firewall | Ask whether the deployment is production and whether inspected or tightly controlled traffic is required. Explain that firewall-based designs are recommended in general, required for production, and optional for non-production only when the customer accepts the simplicity or cost tradeoff. | "Is a firewall required?" |
| Hub selection | Explain the relevant hub choices after the firewall answer, recommend one, then confirm the choice. | "Choose `Hub A`, `Hub B`, `Hub C`, or `Hub E`." |
| CIDR allocation | Explain that CIDRs are the network ranges reserved for OCI networks, ask whether the landing zone must connect to on-premises or another cloud, then separately explain Kubernetes pod and service ranges and the need to avoid overlap with connected networks. | "Provide hub, spoke, platform, pod, and service CIDRs." |

## Terminology Bridge

Introduce these only after the plain-language explanation:

- Deployment environments such as dev, test, and prod -> `environments`
- Standard landing zone run mainly by one operations team -> `One-OE`
- Landing zone for several operations teams sharing one tenancy -> `Multi-OE`
- Network topology family -> hub model such as `Hub A` or `Hub B`
- Kubernetes or shared service layer -> `platform`
- Workload grouping inside an environment -> `project`
- Spoke VCN for workload traffic -> `shared_project_network`

## Multi-OE Warning

If the customer's answers point to `Multi-OE`, warn immediately before continuing:

- `Multi-OE` is typically about multiple operations teams sharing one tenancy, not just about having multiple departments or countries.
- A single tenancy can have at most 500 IAM policy statements from the root compartment to any leaf compartment path.
- This is a hard OCI limit and can shape whether `Multi-OE` is practical in one tenancy.
- Include this Oracle reference when giving that warning: [Policy Statements Limit per Compartment Hierarchy](https://docs.oracle.com/en-us/iaas/Content/Identity/policymgmt/policy-limits-compartment-hierarchy.htm)

## OKE-Specific Guardrails

- If the customer only says they want OKE, do not jump to `oke_simple`, single-stack vs multi-stack, or config snippets.
- Do not assume OKE means `projects` are required.
- Do not assume an environment needs `shared_project_network` unless the intended topology requires a spoke VCN.
- Explain OCI CIDRs separately from Kubernetes pod and service CIDRs, and verify current OCI behavior before making networking claims that are not explicit in the repo.
- If the landing zone must integrate with on-premises networks or another cloud, explain early that overlapping CIDRs will cause routing and connectivity problems and must be avoided in the OCI network plan.
- Do not treat non-production as an automatic reason to recommend a no-firewall hub. Firewall-based designs are still the recommended default unless the customer explicitly accepts the tradeoff for a simpler non-production layout.
- When the customer asks for public access, do not assume the chosen hub needs a brand-new public load balancer design. Check the selected hub guide or runtime artifacts first; in the One-OE one-stack runtime, each hub family already includes a public load balancer example with placeholder backends.
- If the workload or application can expose a private endpoint such as an internal load balancer, explain that the hub public load balancer can target that private endpoint when the chosen design supports it instead of assuming the workload must expose its own separate public load balancer.

## Deployment Delivery Defaults

- Prefer Terraform CLI locally or from customer-controlled CI/CD.
- If ORM is used, stage the configuration files in a customer-controlled private OCI Object Storage bucket or approved private GitHub source and run them through the orchestrator `rms-facade` workflow.
- Do not recommend public raw GitHub or public bucket URLs as the default customer path.
- If a repo document includes a public one-click ORM example, explain that it is reference material only and not the recommended customer deployment path.

## Good Opening After Acceptance

```text
To choose the right landing zone, I'll guide this one decision at a time and keep the repo terms in the background until they matter.

First, will this landing zone be run mainly by one operations team, or will several operations teams share responsibility inside the same tenancy? Terms like department, business unit, country, or operating entity can all fit either case, so the important distinction is the operations model.
```
