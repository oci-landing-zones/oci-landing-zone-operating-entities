# Landing Zone Config Examples

## Minimal Single-Spoke Example

Use this when you need the smallest config that still exercises the new config-driven path.

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
}
```

This keeps hub and spoke subnets implicit, so normalization fills them in.

## Environment Platform Example

Based on `gen/testdata/platform_topology/preprod_oke.jsonnet`.

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    preprod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.31.1',
              services_cidr: '10.96.0.0/16',
              pods_cidr: '10.244.0.0/16',
            },
          },
        },
      },
    },
  },
}
```

Use this when the platform belongs to a specific environment and should inherit environment scope semantics.

## Shared Platform Example

Based on `gen/testdata/platform_topology/shared_platform_oke.jsonnet`.

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    oke: {
      network: { vcn: '10.0.80.0/21' },
      extension: {
        type: 'oke_simple',
        params: {
          kubernetes_version: 'v1.31.1',
          services_cidr: '10.96.0.0/16',
          pods_cidr: '10.244.0.0/16',
        },
      },
    },
  },
}
```

Use this when the platform should live under the shared platform compartment tree rather than an environment.

## Multi-Environment Example

Based on `gen/testdata/platform_topology/prod_preprod_hub_a.jsonnet`.

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.31.1',
              services_cidr: '10.96.0.0/16',
              pods_cidr: '10.244.0.0/16',
            },
          },
        },
      },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.144.0/21' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.31.1',
              services_cidr: '10.97.0.0/16',
              pods_cidr: '10.245.0.0/16',
            },
          },
        },
      },
    },
  },
}
```

This is the right pattern when route priority, platform ordering, and sample backend derivation all matter.

## Commands

Generate formatted config-mode outputs:

```bash
bash gen/generate.sh --config path/to/config.jsonnet output
```

Inspect raw multi-output generation:

```bash
jsonnet --multi output/ --tla-code-file config=path/to/config.jsonnet gen/landing_zone_multi.jsonnet
```

## Common Choices

- Prefer omitted hub and spoke subnet maps when canonical auto-subnet allocation is acceptable.
- Prefer explicit platform subnet maps only when you need non-default layout or the platform is not extension-backed.
- Prefer environment platforms over `shared_platforms` when the platform belongs operationally to one environment.
