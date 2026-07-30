# Generic Multi-OE Landing Zone

## Overview

This runtime publishes a generator-owned Multi-OE landing zone as one integrated Terraform working set. Multi-OE keeps the One-OE landing-zone structure and adds one compartment layer for each operating entity:

```text
Landing Zone
├── shared network, security, and platforms
├── Alpha
│   ├── production
│   └── pre-production
└── Beta
    ├── production
    └── pre-production
```

Environment, platform, project, network, IAM, security, and observability resources below each OE otherwise follow the One-OE model. Qualified keys such as `alpha-prod` and `beta-prod` keep repeated environment names distinct.

The published example deploys to `eu-frankfurt-1` in realm `oc1` and contains:

| Scope | DNS ID | VCN CIDR |
|---|---:|---:|
| Hub | — | `10.0.0.0/21` |
| Alpha production | `al` + environment DNS | `10.0.64.0/21` |
| Alpha pre-production | `al` + environment DNS | `10.0.128.0/21` |
| Beta production | `be` + environment DNS | `10.1.64.0/21` |
| Beta pre-production | `be` + environment DNS | `10.1.128.0/21` |

Each environment contains project `proj1`. Security Zone targeting is enabled for `alpha-prod` and `beta-prod`.

## Choose a hub

| Hub | Traffic inspection | Intended use | Guide |
|---|---|---|---|
| A | Separate DMZ and internal OCI Network Firewalls | Production designs needing separated inspection tiers | [Hub A](multi_oe_hub_a.md) |
| B | One OCI Network Firewall | Production designs needing consolidated inspection | [Hub B](multi_oe_hub_b.md) |
| C | Customer-managed third-party firewalls behind NLBs | Production designs using supported third-party appliances | [Hub C](multi_oe_hub_c.md) |
| E | No firewall | PoC, lab, or explicitly non-production use | [Hub E](multi_oe_hub_e.md) |

Production deployments require a firewalled design. Hub C creates the surrounding OCI network and load-balancer resources, but it does not deploy or manage the firewall appliances.

## Deployment model

Use the pinned [OCI Landing Zones Orchestrator `v2.1.3`](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/v2.1.3). Keep every file selected by a hub guide in one configuration source and one Terraform state.

The recommended delivery paths are:

1. Terraform CLI on a customer-controlled workstation or CI/CD runner, with customer-controlled state storage.
2. OCI Resource Manager using the Orchestrator `rms-facade` and configuration files in a customer-controlled private OCI Object Storage bucket.
3. OCI Resource Manager using the `rms-facade` and an approved private GitHub repository.

Do not use public raw GitHub or public bucket URLs as the default customer deployment path.

Before planning or applying:

1. Select one hub and one CIS level.
2. Copy exactly the files listed for that combination into the private configuration source.
3. Replace all example OCIDs, load-balancer backends, notification email addresses, and other placeholders.
4. Review the CIDRs, IAM policies, security controls, notification recipients, and Terraform plan.

### Staged files use the same state

Hub A, B, and C network routing requires resources created in Step 1. Security Zones and flow logs also use final files after their targets exist.

Step 2 is an update to the original state:

- Remove each selected `*_pre.json` file from the configuration source.
- Add the corresponding final file.
- Keep IAM, governance, and any unchanged network file in the same state.
- Never load a pre file and its final replacement together.
- For Hub C, load exactly one final network alternative: with or without managed NLB backend registrations.

Hub E has no pre-network artifact, but its security and observability files still follow the same replacement flow.

## Extension compatibility boundary

The published runtime contains only the 18 foundation files. OKE Simple, ExaDB-C@C, ExaDB-D/ExaCS, and OCVS compatibility is proven by generator fixtures that repeat environment and platform names across OEs and validate qualified keys, dependencies, IAM, network, and observability outputs.

The compatibility claim covers deterministic generation, collision avoidance, dependency integrity, committed-publication parity, and the Orchestrator `v2.1.3` direct-root input contract. It does not claim OCI service capacity, quota, or a successful plan/apply in a customer tenancy.

Generated OKE files retain the direct-root keys `oke_clusters_configuration` and `oke_workers_configuration`. The Orchestrator `v2.1.3` root accepts those variables, but its `rms-facade` loader searches for legacy OKE keys. Until a compatible facade version is selected, use the direct-root Terraform path for a generated Multi-OE working set that includes OKE; do not claim OKE compatibility through the `v2.1.3` facade.

## Published inventory

The runtime contains exactly 18 generated JSON artifacts:

- IAM and governance: 2
- Hub A/B/C/E network variants: 8
- CIS Level 1/2 security pre/final variants: 4
- CIS Level 1/2 observability pre/final variants: 4

There is no Multi-OE multi-stack publication. Workload extensions are generated through config mode and are not mixed with these foundation snapshots.

## Migration from legacy Generic Multi-OE paths

`BREAKING CHANGE: blueprints/multi-oe/generic_v1 and generic_v2 are removed; use blueprints/multi-oe/generic/runtime.`

This is a repository-path migration. It is not a Terraform-state migration and does not assert that a legacy deployment can replace its configuration files in place. Existing deployments must review their own state and configuration lifecycle before adopting this generator-owned runtime.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
