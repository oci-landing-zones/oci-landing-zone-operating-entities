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

Based on `tests/gen/testdata/direct/pass/config_preprod_security_targets.jsonnet`.

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
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
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

Based on `tests/gen/testdata/direct/pass/config_platform_compartments.jsonnet`.

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
          kubernetes_version: 'v1.35.2',
          services_cidr: '10.96.0.0/16',
          api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
        },
      },
    },
  },
}
```

Use this when the platform should live under the shared platform compartment tree rather than an environment.

## Shared ExaCS With Autonomous Project Tiers

Based on `tests/gen/testdata/configs/pass/prod_preprod_exacs_uc1.jsonnet`.

```jsonnet
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
    },
  },
  shared_platforms: {
    exacs: {
      network: { vcn: '10.0.24.0/21' },
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: {
            prod: ['proj1'],
            preprod: ['proj1'],
          },
          notification_emails: {
            default: ['exacs-platform@example.com'],
            db_workloads: ['exacs-db@example.com'],
            infra_workloads: ['exacs-infra@example.com'],
            projects: ['exacs-projects@example.com'],
          },
        },
      },
    },
  },
}
```

Use this when Exadata infrastructure and AVMC/VMC placement are shared, and Autonomous Database Dedicated should be delegated to selected project DB tiers. The `shared_project_network` entries are only needed when those environments also need project network resources. Do not add environment ExaCS platforms for this shared-only case.

## Multi-Environment Example

Based on `tests/gen/testdata/direct/pass/config_hub_a_staging.jsonnet`.

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
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
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
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.97.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
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
