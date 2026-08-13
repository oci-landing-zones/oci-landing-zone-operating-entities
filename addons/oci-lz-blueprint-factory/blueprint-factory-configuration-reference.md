# Blueprint Factory Configuration Reference

This reference describes the configuration accepted by the OCI LZ Blueprint Factory. It is the source of truth for a generated Landing Zone file set.

The Blueprint Factory accepts JSON and Jsonnet input. Jsonnet is available for advanced reuse and composition; it does not change the supported Blueprint Factory configuration elements.

## Table of Contents

[1. Region and Security Settings](#1-region-and-security-settings)<br>
[2. Hub](#2-hub)<br>
[3. Environments](#3-environments)<br>
[4. Shared Project Network](#4-shared-project-network)<br>
[5. Projects](#5-projects)<br>
[6. Environment Platforms](#6-environment-platforms)<br>
[7. Shared Platforms](#7-shared-platforms)<br>
[8. Workload Extensions](#8-workload-extensions)<br>

## Blueprint Factory Hierarchy

Projects and environment platforms are nested inside an environment. Hub, Bastion, and additional add-ons are sibling top-level Blueprint Factory configuration elements; they are not nested inside an `addons` object.

```text
Blueprint Factory configuration
├── Region and security settings
├── Hub
│   └── Network
├── Bastion
├── <additional add-on>
├── Environments
│   └── <environment>
│       ├── Shared project network
│       │   └── Network
│       ├── Projects
│       │   └── <project>
│       └── Platforms
│           └── <platform>
│               ├── Network
│               └── Workload extension
└── Shared platforms
    └── <platform>
        ├── Network
        └── Workload extension
```

The corresponding configuration nesting is:

```jsonnet
{
  region: '<oci-region>',
  region_short_name: '<region-short-name>',
  realm: 'oc1',
  cis_level: 2,

  hub: {
    kind: '<hub-kind>',
    network: {
      vcn: '<hub-vcn-cidr>',
    },
  },

  environments: {
    '<environment>': {
      shared_project_network: {
        network: {
          vcn: '<spoke-vcn-cidr>',
        },
      },

      projects: {
        '<project>': {},
      },

      platforms: {
        '<platform>': {
          network: {
            vcn: '<platform-vcn-cidr>',
          },
          extension: {
            type: '<registered-extension-type>',
            params: {},
          },
        },
      },
    },
  },

  shared_platforms: {
    '<platform>': {
      network: {
        vcn: '<shared-platform-vcn-cidr>',
      },
      extension: {
        type: '<registered-extension-type>',
        params: {},
      },
    },
  },
}
```

This is a nesting template, not a single deployable configuration. Omit optional blocks that do not apply, and follow the selected workload extension's network requirement.

Every Blueprint Factory configuration needs a hub and at least one named environment. Region metadata is optional as a pair; if omitted, the factory defaults it to `eu-frankfurt-1` and `fra`.

```jsonnet
{
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.0.0/21',
    },
  },
  environments: {
    dev: {},
  },
}
```

This smallest shape creates the shared landing-zone domains for `dev`. Add a shared project network only when the environment needs a spoke VCN, and add projects only when the target design needs project compartments.

## 1. Region and Security Settings

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `region` | string | No* | `eu-frankfurt-1` | OCI region used by generated configuration. |
| `region_short_name` | string | No* | `fra` | Short region label used by resource naming. |
| `realm` | string | No | `oc1` | OCI realm. Supported values are `oc1` and `oc19`. |
| `cis_level` | number or string | No | `2` | CIS level to emit: `1` or `2`. |
| `security_targets` | array of strings | No | All environments | Environment names that receive Security Zone targeting. |

*`region` and `region_short_name` must be supplied together or omitted together. Explicit `null` values are treated as omitted.

`security_targets` can contain only names defined under `environments`. Omit it to apply the default targeting to every configured environment.

## 2. Hub

The hub is the landing zone's central network. Its `kind` selects the supported routing and firewall pattern.

| Hub kind | Description | Required subnet keys when explicitly supplied |
|---|---|---|
| `hub_a` | Dual-firewall hub. | `fw-dmz`, `lb`, `fw-int`, `mgmt`, `mon`, `dns` |
| `hub_b` | Single OCI Network Firewall hub. | `lb`, `fw`, `mgmt`, `mon`, `dns` |
| `hub_c` | Third-party firewall hub. | `untrust`, `trust`, `lb`, `mgmt`, `mon`, `dns` |
| `hub_e` | No-firewall, DRG-based hub. | `lb`, `mgmt`, `mon`, `dns` |

```jsonnet
hub: {
  kind: 'hub_b',
  network: {
    vcn: '10.0.0.0/21',
    // Omit subnets to let the factory allocate the canonical set.
  },
},
```

`network.vcn` is always required and must be a valid CIDR. When `hub.network.subnets` is omitted, the factory allocates the canonical `/24` subnet layout. If it is supplied, it must contain the complete key set for the selected hub, use valid non-overlapping CIDRs, and remain inside the hub VCN.

## 3. Environments

Environment names are object keys. An environment can contain projects, a shared project network, and platforms.

```jsonnet
environments: {
  preprod: {},
  prod: {},
},
```

## 4. Shared Project Network

Use `shared_project_network` when an environment needs a spoke VCN shared by its projects. Omit the subnet map to allocate the standard `web`, `app`, `db`, and `infra` subnet set.

```jsonnet
environments: {
  prod: {
    shared_project_network: {
      network: {
        vcn: '10.0.64.0/21',
      },
    },
  },
},
```

## 5. Projects

Use `projects` to create project scopes in an environment. The project name is the object key.

```jsonnet
environments: {
  prod: {
    projects: {
      api: {},
      data: {},
    },
  },
},
```

## 6. Environment Platforms

Use `platforms` for a platform that belongs to one environment. Each platform can be a plain networked platform or a workload-extension platform.

```jsonnet
environments: {
  prod: {
    platforms: {
      app_platform: {
        network: {
          vcn: '10.0.96.0/22',
          subnets: {
            app: '10.0.96.0/24',
            db: '10.0.97.0/24',
          },
        },
      },
    },
  },
},
```

For a plain platform without an extension, specify both its VCN and explicit subnets. For an extension-backed platform, the extension decides whether a network is required, forbidden, or optional. All hub, spoke, and platform VCN CIDRs must be non-overlapping.

## 7. Shared Platforms

Use `shared_platforms` for a platform shared across environments. Its shape is the same as an environment platform, but it is defined at the top level.

```jsonnet
shared_platforms: {
  shared_service: {
    network: {
      vcn: '10.0.24.0/21',
      subnets: {
        app: '10.0.24.0/24',
        db: '10.0.25.0/24',
      },
    },
  },
},
```

## 8. Workload Extensions

Extensions are nested below a platform. The platform name is a configuration key; the `type` selects the implementation.

```jsonnet
platforms: {
  oke: {
    network: { vcn: '10.0.96.0/21' },
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
```

| Type | Network behavior | Reference |
|---|---|---|
| `oke_simple` | Required | [OKE Blueprint Factory guide](/workload-extensions/oke/simple/oke-blueprint-factory.md) |
| `ocvs` | Required | [OCVS generator guide](/gen/workload-extensions/ocvs/AGENTS.md) |
| `exacs` | Depends on placement | [ExaCS generator guide](/gen/workload-extensions/exacs/AGENTS.md) |
| `exacc` | Forbidden | [ExaDB-C@C generator guide](/gen/workload-extensions/exacc/AGENTS.md) |

`params` is required whenever `extension` is present. Extension-specific validation applies after the general configuration is normalized. Do not add unregistered extension types or use a network where the extension contract forbids one.

Generate into a separate directory and review every emitted file before deployment:

```bash
bash gen/generate.sh --config path/to/config.jsonnet generated
```

The factory always emits `network.json`, `iam.json`, `governance.json`, and the security and observability pair for the selected CIS level. It emits `network_pre.json` only when the selected hub needs staged network deployment. `network_backends.json` and extension-specific files are emitted only when the selected configuration needs them.

## References

- [Blueprint Factory README](./README.md)
- [Blueprint Factory examples](./examples)
- [Generator README](/gen/README.md)
- [Jsonnet composition guide](/gen/JSONNET_COMPOSITION.md) for contributors who need advanced input reuse
- [Jsonnet language reference](https://jsonnet.org/ref/language.html)
- [Jsonnet standard library](https://jsonnet.org/ref/stdlib.html)

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
