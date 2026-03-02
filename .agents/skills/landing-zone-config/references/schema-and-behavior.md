# Landing Zone Config Schema And Behavior

## Source Of Truth

- `gen/config.libsonnet` validates the required config shape and normalizes omitted values.
- `gen/landing_zone.libsonnet` turns normalized config into hub, spoke, platform, IAM, governance, security, observability, and extension outputs.
- `gen/landing_zone_multi.jsonnet` decides which output files appear in config mode.
- `gen/CONVENTIONS.md` explains the intended architecture and naming conventions.

## Minimal Config Shape

```jsonnet
{
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: {
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
- `realm`, defaulting to `oc1` (including when explicitly `null`)
- `hub.network.subnets`
- `shared_platforms`
- `environments.<env>.platforms`

## Normalization Rules

`gen/config.libsonnet` applies these defaults and assertions:

- `hub.kind` must be one of `hub_a`, `hub_b`, `hub_c`, `hub_e`
- If `hub.network.subnets` is omitted, hub subnets are auto-generated from the hub VCN using the canonical order for that hub kind
- If `shared_project_network.network.subnets` is omitted, spoke subnets auto-generate as `web`, `app`, `db`, `infra`
- If a platform omits `network.subnets` and has an `extension`, subnet generation is delegated to that extension
- If a platform omits `network.subnets` and has no `extension`, normalization fails

## Spokes, Platforms, And Shared Platforms

- An environment becomes a spoke only when it defines `shared_project_network`
- `environments.<env>.platforms` creates environment-scoped platform VCNs and IAM hierarchy
- `shared_platforms` creates shared platform VCNs and shared platform compartments
- Platform scope semantics, display labels, DNS short codes, and security-target eligibility come from `gen/topology.libsonnet`

Current topology behavior worth remembering:

- Preferred environment ordering is `prod`, `preprod`, `staging`, `uat`, `dev`, `test`, then any remaining names
- Sample load balancer backends are derived from the first ordered workload spoke's `web` subnet
- Security-target selection is centralized in `gen/topology.libsonnet`; current behavior intentionally targets only `prod`

## Extension Contract

Extensions are registered in `gen/landing_zone.libsonnet` under `extension_registry`.

Current registered type:

- `oke_simple`

An extension-backed platform config looks like this:

```jsonnet
{
  network: { vcn: '10.0.80.0/21' },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.31.1',
      services_cidr: '10.96.0.0/16',
      pods_cidr: '10.244.0.0/16',
    },
  },
}
```

`gen/workload-extensions/oke/simple/oke_simple.libsonnet` enforces:

- `config_params.kubernetes_version`
- `config_params.pods_cidr`
- `config_params.services_cidr`

It also contributes default platform subnets when the platform omits explicit `network.subnets`.

## Output Model

`gen/landing_zone_multi.jsonnet` always emits:

- `network.json`
- `iam.json`
- `governance.json`
- `security_cis1_pre.json`
- `security_cis1.json`
- `security_cis2_pre.json`
- `security_cis2.json`
- `observability_cis1_pre.json`
- `observability_cis1.json`
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
5. When changing schema or extension assumptions, update tests or regression fixtures that cover config mode.
