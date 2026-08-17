# Landing Zone Config Schema And Behavior

## Source Of Truth

- `gen/config.libsonnet` validates the required config shape and normalizes omitted values.
- `gen/landing_zone.libsonnet` turns normalized config into hub, spoke, platform, IAM, governance, security, observability, and extension outputs.
- `gen/landing_zone_multi.jsonnet` decides which output files appear in Blueprint Factory config mode.
- `gen/AGENTS.md` explains the intended architecture, naming conventions, and publication guardrails.

## Minimal Config Shape

```jsonnet
{
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      project_network: {
        network: { vcn: '10.0.64.0/21' },
      },
      projects: { proj1: {} },
    },
  },
}
```

Required by `gen/config.libsonnet`:

- `config.hub.kind`
- `config.hub.network.vcn`
- `config.environments`, with at least one environment

Optional but important:

- `region`, defaulting to `eu-frankfurt-1`
- `region_short_name`, defaulting to `fra`
- `realm`, defaulting to `oc1` (including when explicitly `null`); supported values are `oc1` and `oc19`
- `cis_level`, defaulting to `2`; Blueprint Factory config mode emits only the selected CIS level's security and observability files
- `hub.network.subnets`
- `environments.<env>.project_network`
- `environments.<env>.projects`
- `shared_platforms`
- `environments.<env>.platforms`

## Normalization Rules

`gen/config.libsonnet` applies these defaults and assertions:

- `hub.kind` must be one of `hub_a`, `hub_b`, `hub_c`, `hub_e`
- `region` and `region_short_name` must be provided together or omitted together
- `realm` must be one of the realms defined in `gen/constants.libsonnet`
- `cis_level` must be `1` or `2`; strings `'1'` and `'2'` are also normalized
- If `hub.network.subnets` is omitted, hub subnets are auto-generated from the hub VCN using the canonical order for that hub kind
- If `project_network.network.subnets` is omitted, shared subnets auto-generate as `web`, `app`, `db`, and `infra`
- If `project_network.network.subnets` is `{}`, the project VCN has no shared subnets
- A non-empty shared-subnet map is exact: every supplied named CIDR is emitted and no `web`, `app`, `db`, or `infra` subnet is added implicitly
- `project_network.subnet_routing` defaults to `vcn`; `hub` is supported for firewalled Hub A, Hub B, and Hub C, while Hub E is rejected
- `projects.<project>.subnets` requires `project_network` and must contain at least one named CIDR
- Shared and dedicated subnet CIDRs must be canonical, contained by the project VCN, and mutually non-overlapping
- If a platform omits `network.subnets` and has an `extension`, subnet generation is delegated to that extension
- If a platform omits `network.subnets` and has no `extension`, normalization fails

## Spokes, Platforms, And Shared Platforms

- An environment becomes a spoke only when it defines `project_network`
- `environments.<env>.platforms` creates environment-scoped platform VCNs and IAM hierarchy
- `shared_platforms` creates shared platform VCNs and shared platform compartments
- Platform scope semantics, display labels, DNS short codes, and security-target eligibility come from `gen/topology.libsonnet`

Current topology behavior worth remembering:

- Preferred environment ordering is `prod`, `preprod`, `staging`, `uat`, `dev`, `test`, then any remaining names
- Sample load balancer backends are derived from the first ordered workload spoke whose normalized shared-subnet map contains `web` (including the omitted-map defaults); otherwise the public hub LB example uses non-working `0.0.0.0` backends. No workload is exposed by those placeholders, but the public listener and ingress NSG still require review before production use.
- Security-target selection is centralized in `gen/topology.libsonnet`; omitted `security_targets` targets all defined environments

## Project Networks And Dedicated Subnets

`project_network` creates one environment project VCN. Shared subnets are
controlled under `project_network.network.subnets`: omission generates the four
defaults, `{}` means none, and a non-empty map is exact. A project may
additionally define dedicated subnets under
`projects.<project>.subnets`:

```jsonnet
prod: {
  project_network: {
    subnet_routing: 'vcn',
    network: {
      vcn: '10.0.64.0/21',
      subnets: { frontend: '10.0.64.0/24' },
    },
  },
  projects: {
    api: { subnets: { jobs: '10.0.68.0/26' } },
    data: {},
  },
}
```

- All shared and dedicated subnets stay in the environment `NETWORK` compartment.
- Shared subnets are the recommended design default because multiple projects can use the allocated ranges efficiently. Dedicated subnet ranges provide separate project CIDR allocation and lifecycle management, but can leave significant unused address capacity.
- Subnet access is governed at the environment `NETWORK` compartment. The factory does not generate per-subnet IAM conditions, so dedicated allocation is not an IAM boundary.
- `subnet_routing: 'vcn'` keeps OCI local routing. `hub` sends traffic between
  different subnets through the Hub A/B/C firewall path. Same-subnet traffic is
  always direct. Hub C follows its normal staged deployment and requires real
  firewall backend targets in place of generated placeholders. Hub E has no
  firewall and is blocked.

## Extension Contract

Extensions are registered in `gen/landing_zone.libsonnet` under `extension_registry`.

Current registered types:

- `oke_simple`
- `exacc`
- `exacs`
- `ocvs`

An extension-backed platform config looks like this:

```jsonnet
{
  network: { vcn: '10.0.80.0/21' },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.35.2',
      services_cidr: '10.96.0.0/16',
      api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
    },
  },
}
```

`gen/workload-extensions/oke/simple/oke_simple.libsonnet` enforces:

- `config_params.kubernetes_version`
- `config_params.services_cidr`
- `config_params.api_endpoint_allowed_cidrs`
- `config_params.pods_cidr` only as an optional passthrough when you explicitly want to set it

For the current native OKE contract, pod IPs come from the generated or explicit pod subnet inside the OKE VCN. `services_cidr` remains the explicit Kubernetes-internal service range, and `pods_cidr` is not required for the standard native path even though the downstream `cis-oke` module can still accept it if you deliberately pass it through. In the emitted cluster payload, those values belong under `options.kubernetes_network_config`.
It also contributes default platform subnets when the platform omits explicit `network.subnets`.

`gen/workload-extensions/exacs/exacs_builder.libsonnet` enforces ExaCS placement semantics:

- Database placement means AVMC/VMC placement and requires `platform.network`; the extension auto-generates `db` and `backup` subnets when explicit subnets are omitted
- Infrastructure-only placement is inferred when an ExaCS platform has no `network`
- `project_db_compartments` is only for Autonomous Database Dedicated project tiers; `project_network` is only needed when that environment also needs project network resources
- Shared infrastructure plus shared AVMC/VMC uses `shared_platforms.exacs` with `network`
- Shared infrastructure plus environment AVMC/VMC uses `shared_platforms.exacs` without `network` and networked `environments.<env>.platforms.exacs`
- Dedicated infrastructure plus dedicated AVMC/VMC uses only networked `environments.<env>.platforms.exacs`

## Output Model

`gen/landing_zone_multi.jsonnet` always emits:

- `network.json`
- `iam.json`
- `governance.json`

For the selected `cis_level`, it also emits one security and one observability pair. Omitted `cis_level` defaults to level 2:

- `cis_level: 1`
  - `security_cis1_pre.json`
  - `security_cis1.json`
  - `observability_cis1_pre.json`
  - `observability_cis1.json`
- `cis_level: 2` or omitted
  - `security_cis2_pre.json`
  - `security_cis2.json`
  - `observability_cis2_pre.json`
  - `observability_cis2.json`

Conditional outputs:

- `network_pre.json` only for staged hubs that require pre-deployment output
- `network_backends.json` only when backends are present in the orchestrated result
- `<extra>.json` for each extension contribution returned in `result.extra`

## Operational Checklist

1. Start from the smallest valid config.
2. Add one environment or platform at a time.
3. Run `bash gen/generate.sh --config <config_file> [output_dir]`.
4. Validate `network.json` as the canonical final network artifact; expect `network_pre.json` only for staged hubs.
5. When changing schema or extension assumptions, update tests or regression fixtures that cover Blueprint Factory config mode.
