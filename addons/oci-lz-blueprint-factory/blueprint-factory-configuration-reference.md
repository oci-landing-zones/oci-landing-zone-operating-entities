# Blueprint Factory Configuration Reference

This reference describes the configuration accepted by the OCI LZ Blueprint Factory. It is the source of truth for a generated Landing Zone file set.

The Blueprint Factory accepts JSON and Jsonnet input. Jsonnet is available for advanced reuse and composition; it does not change the supported Blueprint Factory configuration elements.

## Table of Contents

[1. Region, Stack Scope, and Security Settings](#1-region-stack-scope-and-security-settings)<br>
[2. Hub](#2-hub)<br>
[3. Environments](#3-environments)<br>
[4. Project Network](#4-project-network)<br>
[5. Projects](#5-projects)<br>
[6. Environment Platforms](#6-environment-platforms)<br>
[7. Shared Platforms](#7-shared-platforms)<br>
[8. Workload Extensions](#8-workload-extensions)<br>
[9. VPN and FastConnect](#9-vpn-and-fastconnect)<br>

## Blueprint Factory Hierarchy

Projects and environment platforms are nested inside an environment. Hub, Bastion, and additional add-ons are sibling top-level Blueprint Factory configuration elements; they are not nested inside an `addons` object.

```text
Blueprint Factory configuration
├── Region, stack scope, and security settings
├── Hub
│   └── Network
├── Bastion
├── <additional add-on>
├── Environments
│   └── <environment>
│       ├── Project network
│       │   └── Shared subnets
│       ├── Projects
│       │   └── <project>
│       │       └── Dedicated subnets
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
  stack_scope: 'complete',

  hub: {
    kind: '<hub-kind>',
    network: {
      vcn: '<hub-vcn-cidr>',
    },
  },

  environments: {
    '<environment>': {
      project_network: {
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

Every Blueprint Factory configuration needs a hub. The `environments` object is optional and defaults to empty for a shared-services and hub-only Landing Zone. Region metadata is optional as a pair; if omitted, the factory defaults it to `eu-frankfurt-1` and `fra`. `stack_scope` defaults to `complete`; set it to `regional` only when the source config intentionally owns regional resources without the home-owned IAM and governance domains.

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

This small shape creates the shared landing-zone domains plus the `dev` environment compartments. For a hub-only Landing Zone without environment compartments or spoke networks, omit `environments` as shown in the [no-environments example](./examples/00-no-environments.json). An explicit `environments: {}` has the same result. Add a project network only when an environment needs a spoke VCN, and add projects only when the target design needs project compartments.

## 1. Region, Stack Scope, and Security Settings

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `region` | string | No* | `eu-frankfurt-1` | OCI region used by generated configuration. |
| `region_short_name` | string | No* | `fra` | Short region label used by resource naming. |
| `dr_region` | string | No | Omitted | DR region whose Object Storage service must be authorized by complete home IAM. Must differ from `region`. |
| `realm` | string | No | `oc1` | OCI realm. Supported values are `oc1` and `oc19`. |
| `cis_level` | number or string | No | `2` | CIS level to emit: `1` or `2`. |
| `stack_scope` | `complete` or `regional` | No | `complete` | Declares which resource domains this source config owns. |
| `security_targets` | array of strings | No | All environments | Environment names that receive Security Zone targeting. |
| `notification_emails` | object of email arrays | No | Published example address | One-OE Cloud Guard, IAM, Network, and Security topic recipients. |

*`region` and `region_short_name` must be supplied together or omitted together. Explicit `null` values are treated as omitted.

`security_targets` can contain only names defined under `environments`. Omit it to apply the default targeting to every configured environment.

`stack_scope: 'regional'` emits regional network, security, observability, and workload-extension files, including CIS2 Vaults and keys. Shared IAM and governance remain in the complete stack. See the [One-OE DR guide](../oci-lz-dr/one-oe/README.md) for deployment requirements.

`notification_emails` accepts `default`, `cloudguard`, `iam`, `network`, and `security`. Each supplied value is a non-empty array of email addresses. A topic-specific list replaces `default` for that topic. If neither is supplied, that topic retains the published `email.address@example.com` example subscriber. The `network` topic also receives network events and alarms in ExaCS designs; ExaDB-C@C does not create a network topic.

```jsonnet
notification_emails: {
  default: ['ops@example.com'],
  network: ['network-ops@example.com'],
},
```

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

`environments` is optional. When present, environment names are object keys and each environment can contain projects, a project network, and platforms. Omitting the field or using an empty object emits no environment-scoped compartments, policies, networks, security-zone targets, or observability resources.

```jsonnet
environments: {
  preprod: {},
  prod: {},
},
```

## 4. Project Network

Use `project_network` when an environment needs a spoke VCN. Its network may contain subnets shared by all projects as well as subnets allocated separately to individual projects.

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `project_network.network` | object | Yes | — | Project VCN configuration. |
| `project_network.network.vcn` | CIDR string | Yes | — | CIDR of the environment project VCN. |
| `project_network.network.subnets` | object | No | Standard shared set | Exact map of shared subnet names to CIDRs. Omit it for `web`, `app`, `db`, and `infra`; use `{}` for no shared subnets. |
| `project_network.subnet_routing` | `vcn` or `hub` | No | `vcn` | Routing between subnets in the project VCN. |

```jsonnet
environments: {
  prod: {
    project_network: {
      network: {
        vcn: '10.0.64.0/21',
      },
    },
  },
},
```

A non-empty shared-subnet map is authoritative: the factory emits exactly those entries and does not add standard subnets around them. Every subnet CIDR must be canonical, contained by the project VCN, and non-overlapping.

`subnet_routing: 'vcn'` retains OCI local routing. `hub` routes traffic between different subnets through the generated firewall path and is supported with Hub A, Hub B, and Hub C. Hub E rejects `hub` because it has no firewall. Hub C requires real firewall targets in place of the generated non-working backend placeholders. NLB backends support VM primary and qualified secondary-interface keys in NLB backend `target_id`; see the [Hub C backend contract](/addons/oci-hub-models/hub_c/readme.md#backend-targets).

## 5. Projects

Use `projects` to create project scopes in an environment. The project name is the object key. A project can optionally request one or more separately allocated subnets inside its environment's `project_network` VCN.

```jsonnet
environments: {
  prod: {
    project_network: {
      network: {
        vcn: '10.0.64.0/21',
        subnets: {
          frontend: '10.0.64.0/24',
        },
      },
    },
    projects: {
      api: {
        subnets: {
          jobs: '10.0.68.0/26',
        },
      },
      data: {},
    },
  },
},
```

`projects.<project>.subnets` must be a non-empty map and requires `project_network`. Project-dedicated subnet CIDRs follow the same canonical, containment, and non-overlap rules as shared subnets.

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

The factory always emits `network.json`, `iam.json`, `governance.json`, and the security and observability pair for the selected CIS level. `network_backends.json` and extension-specific files are emitted only when the selected configuration needs them.

## 9. VPN and FastConnect

Use `hybrid_connectivity` at the top level alongside `hub` and `environments`. It is optional; omitting it leaves existing landing zone generation unchanged. All four resource maps default to `{}`. Configure either service independently, or both for redundant private connectivity.

This section documents the factory input, not the full downstream networking-module schema. Resource display names, compartments, DRG references, static VPN routes and attachment route-table assignments are generated. Do not add module-only fields such as `drg_id`, `gateway_key`, `static_routes`, `display_name` or `default_drg_route_tables` to these input objects.

VPN tunnel and private FastConnect attachments share the generated `hc` (Hybrid Connectivity) DRG ingress table. Its local routes preserve the hub's inspection policy, providing the same ingress routing on either connection.

### 9.1 Resource maps and names

| Field under `hybrid_connectivity` | Type | Purpose |
|---|---|---|
| `customer_premises_equipments` | object of named CPE objects | Create OCI metadata for customer VPN equipment. |
| `ipsecs` | object of named VPN objects | Create connections, manage both tunnels and prepare private routing. |
| `fast_connect_virtual_circuits` | object of named circuit objects | Create private FastConnect circuits. |
| `cross_connect_groups` | object of named physical group objects | Prepare groups and physical ports before creating final circuits. |

Configuration names contain 1–40 lowercase letters, digits, hyphens or underscores. Underscores become hyphens in generated names: `branch_a` and `branch-a` therefore cannot coexist in the same map. Studio additionally requires a name to start with a letter or digit. The same naming rules apply to circuit mappings and physical ports.

### 9.2 Customer equipment

Each `customer_premises_equipments.<name>` accepts:

| Field | Type | Required / default | Meaning and example |
|---|---|---|---|
| `ip_address` | IPv4 string | Required | Outside address used to reach the equipment, for example `203.0.113.10` (illustrative). |

Blueprint Factory creates CPE records with the **Other** device type. A CPE object describes customer equipment; it does not configure the physical router. See [OCI VPN setup](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm).

### 9.3 VPN connections

Each `ipsecs.<name>` accepts:

| Field | Type | Required / default | Meaning and example |
|---|---|---|---|
| `cpe_key` | string | Exactly one of `cpe_key` / `cpe_id` | Name in `customer_premises_equipments`, for example `office`. |
| `cpe_id` | string | Alternative to `cpe_key` | Existing OCI CPE OCID beginning `ocid1.cpe.`. |
| `remote_cidrs` | non-empty array of IPv4 CIDRs | Required | Expected remote networks, for example `['172.20.0.0/16']`. Also supplies the connection's static routes. |
| `cpe_local_identifier` | string | Required when the router sends a different IKE identity | Omission uses the CPE object's public IP. Enter the actual router identity when it differs, for example a private IP or hostname behind NAT. NAT alone does not require an override. |
| `cpe_local_identifier_type` | string | `IP_ADDRESS` when omitted | `IP_ADDRESS` or `HOSTNAME`; match the identity sent by the router. `HOSTNAME` requires a nonblank identifier. |
| `tunnels_management` | object | Required | Both `tunnel_1` and `tunnel_2`, each using the fields below. |

Both managed tunnel objects accept:

| Field | Type | Required / default | Meaning and example |
|---|---|---|---|
| `routing` | string | Required | `STATIC` or `BGP`. Policy-based tunnels are outside this add-on's input contract. |
| `ike_version` | string | `V2` | `V1` or `V2`; match the peer. |
| `shared_secret` | string | Omitted | Literal key, or an existing `ocid1.vaultsecret...` reference. Omission lets OCI generate a key for a new tunnel. |
| `bgp_session_info` | object | Required for BGP | Customer ASN and the inside-tunnel addresses below. Static tunnels may supply the address pair for monitoring, without an ASN. |
| `phase_one_details` | object | Optional | IKE phase 1 overrides described below. |
| `phase_two_details` | object | Optional | IPSec phase 2 overrides described below. |

Each `bgp_session_info` accepts:

| Field | Type | Requirement | Example |
|---|---|---|---|
| `customer_bgp_asn` | number or decimal string | Required for `BGP`; omit for `STATIC`. Range 1–4294967294, excluding OCI-reserved 65534. | `'65001'` |
| `customer_interface_ip` | IPv4 address/prefix string | Required for BGP; supply together with Oracle address. | `'169.254.20.1/30'` |
| `oracle_interface_ip` | IPv4 address/prefix string | Different host in the same `/30` or `/31` subnet. | `'169.254.20.2/30'` |

Use a distinct address pair for each tunnel. OCI reserves `169.254.10.0–169.254.19.255`, `169.254.100.0–169.254.109.255`, and `169.254.192.0–169.254.201.255` for other purposes; the factory rejects these inside-tunnel addresses. Review [OCI's setup prerequisites](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm) when assigning addresses.

### 9.4 Custom IKE and IPSec settings

All fields below are optional. Omission retains downstream module/OCI behavior. Enable custom proposals only after agreeing settings with the customer router administrator. Use the exact API values listed below; listing a value does not recommend overriding OCI defaults.

Without custom proposals, OCI offers multiple proposals and the router negotiates a compatible selection. Studio displays the published commercial-cloud proposal lists; it cannot know the negotiated algorithm before connection. The published standard PFS setting is enabled with `GROUP5`; an omitted PFS flag does not mean disabled. Check the applicable region/realm settings against [Oracle's supported IPSec parameters](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/supportedIPsecparams.htm).

| Object | Field | Type | Meaning / example |
|---|---|---|---|
| `phase_one_details` | `is_custom_phase_one_config` | boolean | Enable custom IKE phase 1 proposals, for example `true`. |
| `phase_one_details` | `custom_authentication_algorithm` | string | Allowed: `SHA2_384`, `SHA2_256`, `SHA1_96`. |
| `phase_one_details` | `custom_encryption_algorithm` | string | Allowed: `AES_256_CBC`, `AES_192_CBC`, `AES_128_CBC`. |
| `phase_one_details` | `custom_dh_group` | string | Allowed: `GROUP2`, `GROUP5`, `GROUP14`, `GROUP19`, `GROUP20`, `GROUP24`. |
| `phase_one_details` | `lifetime` | positive number | Lifetime in seconds; OCI default is 28800. |
| `phase_two_details` | `is_custom_phase_two_config` | boolean | Enable custom IPSec phase 2 proposals. |
| `phase_two_details` | `custom_authentication_algorithm` | string | Allowed: `HMAC_SHA2_256_128`, `HMAC_SHA1_128`. |
| `phase_two_details` | `custom_encryption_algorithm` | string | Allowed: `AES_256_GCM`, `AES_192_GCM`, `AES_128_GCM`, `AES_256_CBC`, `AES_192_CBC`, `AES_128_CBC`. GCM includes authentication. |
| `phase_two_details` | `dh_group` | string | Allowed: `GROUP2`, `GROUP5`, `GROUP14`, `GROUP19`, `GROUP20`, `GROUP24`. Applies when PFS is enabled. |
| `phase_two_details` | `is_pfs_enabled` | boolean | Enable or disable perfect forward secrecy; coordinate with the peer. |
| `phase_two_details` | `lifetime` | positive number | Lifetime in seconds; OCI default is 3600. |

The factory checks each supplied non-null algorithm and DH group against its field's allowed values, including when custom proposals are disabled. Omitted or null optional values retain existing behavior. Studio and the factory share the [same option lists](../../gen/addons/oci-hybrid-connectivity/ipsec-options.json), based on Oracle's [phase 1 API contract](https://github.com/oracle/oci-go-sdk/blob/master/core/phase_one_config_details.go) and [phase 2 API contract](https://github.com/oracle/oci-go-sdk/blob/master/core/phase_two_config_details.go). The phase 1 API includes `GROUP24`, although the supported-parameters guide omits it from its phase 1 list.

The factory also checks types and positive lifetimes. OCI and the peer must accept the selected combination; accepted individual values do not establish compatibility between proposals. Consult [supported IPSec parameters](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/supportedIPsecparams.htm) and the [VPN setup guide](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm). Changing routing, addresses or keys can interrupt a tunnel.

### 9.5 FastConnect virtual circuits

Only private FastConnect circuits are supported. `type: 'PUBLIC'`, `public_prefixes` and `routing_policy` are rejected; existing public-circuit configurations are not converted automatically.

Each `fast_connect_virtual_circuits.<name>` accepts:

| Field | Type | Required / default | Meaning and example |
|---|---|---|---|
| `type` | string | Required | Must be `PRIVATE` for landing zone networks. Public circuits are unsupported. |
| `remote_cidrs` | non-empty array of IPv4 CIDRs | Required | Expected private reachability, for example `['172.20.0.0/16']`. |
| `provider_service_id` | string | For provider connections; a physical mapping is the alternative | OCI FastConnect provider service-offering OCID for the target realm and region. |
| `provider_service_key_name` | string | Optional | OCID or service key supplied by the partner. If it supplies neither, leave this empty and give the deployed virtual circuit OCID to the partner. The initiating side and setup order depend on the provider. |
| `bandwidth_shape_name` | string | Optional in input; select the required shape for your service | A positive integer followed by one space and `Gbps`, for example `1 Gbps`, `20 Gbps` or `400 Gbps`. Leading zeros, fractions and other units are rejected. Available shapes depend on the provider and region; valid format does not confirm availability. |
| `customer_asn` | number or decimal string | When your router peers with Oracle | Customer ASN, excluding 65534. |
| `cross_connect_mappings` | object of named mappings | `{}` | Physical/BGP mapping settings described below. Requirements depend on the provider or direct connection. |
| `bgp_admin_state` | string | OCI default `ENABLED` | `ENABLED` or `DISABLED`; disabling the session interrupts its routes. |
| `ip_mtu` | number | Optional | Layer 3 MTU in bytes, for example `1500`; maximum 9000. |
| `is_bfd_enabled` | boolean | OCI default `false` | Enable BFD for IPv4 BGP peers when supported on both ends. |
| `provision_fc_virtual_circuit` | boolean | `true` | `false` suppresses circuit creation and its generated private routes. Required input fields still apply; omit circuits entirely during physical preparation. |

Use `provider_service_id` from the service available in your target realm and region. Name-based `provider_service` input is not accepted. `provider_service_key_name` is a separate provider activation reference. See the [Oracle partner connection guide](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectprovider.htm).

Each `cross_connect_mappings.<name>` accepts:

| Field | Type | Required / default | Meaning and example |
|---|---|---|---|
| `cross_connect_or_cross_connect_group_id` | string | Existing physical connection path | Real cross-connect/group OCID. Symbolic configuration keys are unsupported here. |
| `customer_bgp_peering_ip` | IPv4 address/prefix string | Private peering, according to connection model | Customer/provider end, for example `192.168.254.1/30`. |
| `oracle_bgp_peering_ip` | IPv4 address/prefix string | Supply together with customer address | Oracle end, for example `192.168.254.2/30`. Different hosts in the same `/28` through `/31` subnet. |
| `vlan` | number or decimal string | According to physical/provider service | Direct VLAN 100–4094, for example `100`. |
| `bgp_md5auth_key` | string | Optional | Literal BGP MD5 key agreed with the peer. Existing Vault secret OCIDs are not resolved for this field. |

The customer/provider supplies the agreed private BGP address pair. See [FastConnect requirements](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectrequirements.htm) and the [Oracle partner connection guide](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectprovider.htm).

### 9.6 Physical groups and ports

Each `cross_connect_groups.<name>` accepts:

| Field | Type | Required / default | Meaning |
|---|---|---|---|
| `customer_reference_name` | string | Optional | Customer/provider reference for the physical group. |
| `cross_connects` | object of named ports | `{}` | Port definitions below. Add the ports needed for the physical design. |

Each `cross_connects.<name>` accepts:

| Field | Type | Required / default | Meaning |
|---|---|---|---|
| `location_name` | string | Required | Exact FastConnect location name available in the region. |
| `port_speed_shape_name` | string | Required | Available physical port shape, for example `10 Gbps`. |
| `customer_reference_name` | string | Optional | Reference identifying the cable/port. |
| `near_cross_connect_or_cross_connect_group_id` | string | Optional | Existing connection/group OCID requesting same-router proximity. |
| `far_cross_connect_or_cross_connect_group_id` | string | Optional | Existing connection/group OCID requesting router separation. |

Create the physical group/ports first, complete cabling and activation, then add circuits using real OCIDs. The add-on does not order carrier services, cable ports or configure customer routers. See [OCI colocation setup](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectcolocate.htm).

### 9.7 Routing, keys and deployment

- Remote networks must not overlap local hub, spoke, platform or remote-peering ranges. Identical VPN/private FastConnect prefixes can be reused for backup; partial overlaps are rejected.
- Both VPN tunnel attachments and private circuit attachments use the shared `hc` ingress table. Hubs A/B/C retain the existing firewall path; Hub E routes directly to local VCNs.
- The factory assigns tables to managed attachments. It does not change DRG-wide defaults for future attachments outside this configuration. ECMP is disabled; actual BGP advertisements and OCI route selection decide the active path.
- VPN `shared_secret` accepts a literal key or existing secret OCID. Literal VPN keys use letters, digits and spaces. BGP MD5 keys are literal values only. There is no separate secrets file or automatic copy into the LZ Vault.
- In Studio, entered keys are session-only and masked in previews; exports contain the actual values. Saved designs require key re-entry, and secret-bearing outputs are not cached.
- Use the documented Terraform CLI deployment path with Orchestrator v2.2.0 / Networking v0.9.0. The pinned RMS facade has incompatible provider constraints. Existing secret references and physical connections must be ready before their connectivity apply.

**Manual post-deployment configuration required:** configure peer equipment and advertisements, complete carrier work, and permit approved traffic in firewall policy, NSGs and security lists. The customer owns those resources' lifecycle, drift management and compliance review.

Follow the [customer guide](../oci-hybrid-connectivity/README.md) for Studio steps, generation, staged deployment, verification and the impact of unavailable prerequisites. Start from the [complete examples](../oci-hybrid-connectivity/examples/) for static VPN, BGP VPN, FastConnect with VPN backup, existing physical connections or physical preparation.

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
