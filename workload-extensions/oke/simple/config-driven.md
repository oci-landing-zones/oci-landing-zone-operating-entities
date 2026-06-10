# OKE Config-Driven Generation <!-- omit from toc -->

- [**1. Overview**](#1-overview)
- [**2. Prerequisites**](#2-prerequisites)
- [**3. What `oke_simple` Means**](#3-what-oke_simple-means)
- [**4. Native OKE Example**](#4-native-oke-example)
- [**5. Overlay OKE Example**](#5-overlay-oke-example)
- [**6. OKE VCN Sizing**](#6-oke-vcn-sizing)
- [**7. Manual OKE Subnet CIDRs**](#7-manual-oke-subnet-cidrs)
- [**8. Generate the JSON Files**](#8-generate-the-json-files)
- [**9. Review the Output**](#9-review-the-output)

## **1. Overview**

Use config-driven generation when the published OKE JSON files do not match the landing zone you need. This is useful when you need custom CIDR ranges, multiple environments, more than one OKE cluster, or overlay networking.

The OKE simple workload extension is configured as a platform extension named `oke_simple`. It can generate two OKE network modes:

| Mode | Configuration | Result |
| --- | --- | --- |
| Native | Omit `cni_type`, or set `cni_type: 'native'` and `cni: 'vcn_native'` | Creates control plane, internal load balancer, worker, and pod subnets. |
| Overlay | Set `cni_type: 'overlay'` and `cni: 'flannel'` | Creates control plane, internal load balancer, and worker subnets. Pod addressing uses the Kubernetes overlay pod CIDR. |

For overlay clusters, the requested OKE CNI is Flannel. In the workload-extension configuration, do not set `cni_type` to `flannel`; use `cni_type: 'overlay'`.

## **2. Prerequisites**

Before generating the files:

- Clone this repository locally.
- Install a Jsonnet renderer on your `PATH`. The standard `jsonnet` command works; `jrsonnet` can also be used for faster local generation.
- Decide the output directory where the generated JSON files should be written.
- Confirm the CIDR plan for the hub, any project VCNs, OKE VCNs, Kubernetes services, and, for overlay, Kubernetes pods.

## **3. What `oke_simple` Means**

`oke_simple` is the OKE workload extension type used by config-driven generation. When a platform uses `extension.type: 'oke_simple'`, the generator adds the OKE network, IAM, cluster, worker, security, and observability JSON needed for that platform.

This is different from the published deployment folders:

| Option | What it is | When to use it |
| --- | --- | --- |
| `oke_simple` | The config-driven OKE extension type. | Use this when generating a customized landing zone from a configuration file. |
| `simple/single-stack` | A published OKE JSON package that deploys the landing zone and OKE together. | Use this for the standard Hub E single-stack deployment. |
| `simple/multi-stack` | A published OKE JSON package that adds OKE to an existing landing zone. | Use this for the standard multi-stack deployment path. |
| `advanced` | A separate guided deployment path with more manual steps. | Use this only when following the advanced OKE extension documentation. |

In config-driven generation, use `oke_simple` for OKE platforms.

## **4. Native OKE Example**

The following example creates a One-OE landing zone with Hub E and one native OKE cluster in the `prod` environment.

Create a configuration file, for example `oke-native.jsonnet`:

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: {
    kind: 'hub_e',
    network: {
      vcn: '10.0.0.0/21',
    },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.72.0/21',
        },
      },
      projects: {
        proj1: {},
      },
      platforms: {
        oke: {
          network: {
            vcn: '10.0.80.0/20',
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              cni_type: 'native',
              cni: 'vcn_native',
              cluster_size: 'small',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
```

Native mode is the default. It creates an OCI pod subnet and wires the worker node pool with pod subnet and pod NSG references.

## **5. Overlay OKE Example**

The following example creates a Hub A landing zone with overlay OKE clusters in `prod` and `preprod`.

Create a configuration file, for example `oke-overlay-hub-a.jsonnet`:

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: {
    kind: 'hub_a',
    network: {
      vcn: '10.0.0.0/21',
    },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.64.0/21',
        },
      },
      projects: {
        proj1: {},
      },
      platforms: {
        oke: {
          network: {
            vcn: '10.0.80.0/20',
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              cni_type: 'overlay',
              cni: 'flannel',
              cluster_size: 'small',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
    preprod: {
      shared_project_network: {
        network: {
          vcn: '10.0.128.0/21',
        },
      },
      projects: {
        proj1: {},
      },
      platforms: {
        oke: {
          network: {
            vcn: '10.0.144.0/20',
          },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.97.0.0/16',
              cni_type: 'overlay',
              cni: 'flannel',
              cluster_size: 'small',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
            },
          },
        },
      },
    },
  },
}
```

Overlay mode omits the OCI pod subnet, pod route table, pod security list, pod NSG, and worker pod networking references. If `pods_cidr` is not provided, it defaults to `10.244.0.0/16`.

## **6. OKE VCN Sizing**

Auto-subnet profiles are the default way to define OKE subnetting. The user provides the OKE VCN CIDR, and may optionally provide `cluster_size`; when `cluster_size` is omitted, the generator uses the `small` profile. The generator then creates the required OKE subnets.

The OKE VCN CIDR prefix must match the selected or defaulted size exactly:

| `cluster_size` | Required OKE VCN prefix |
| --- | --- |
| `small` | `/20` |
| `medium` | `/18` |
| `large` | `/16` |

With native networking, the generator creates these subnet sizes:

| `cluster_size` | Pod subnet | Worker subnet | Internal LB subnet | Control plane subnet |
| --- | --- | --- | --- | --- |
| `small` | `/21` | `/23` | `/26` | `/29` |
| `medium` | `/19` | `/22` | `/25` | `/29` |
| `large` | `/17` | `/19` | `/24` | `/29` |

With overlay networking, the generator creates these subnet sizes:

| `cluster_size` | Worker subnet | Internal LB subnet | Control plane subnet |
| --- | --- | --- | --- |
| `small` | `/23` | `/26` | `/29` |
| `medium` | `/22` | `/25` | `/29` |
| `large` | `/19` | `/24` | `/29` |

If `cluster_size` is set, do not also define OKE platform subnets in the configuration. To use the default `small` profile, omit both `cluster_size` and manual OKE platform subnets.

## **7. Manual OKE Subnet CIDRs**

Use manual subnet CIDRs only when the standard cluster size profiles do not fit the required address plan.

To provide manual OKE subnet CIDRs:

- Omit `cluster_size`.
- Add `network.subnets` under the OKE platform.
- Use the exact subnet keys expected by the selected network mode.
- Keep every subnet CIDR inside the OKE VCN CIDR.
- Keep subnet CIDRs non-overlapping.

Native networking requires these subnet keys:

```jsonnet
network: {
  vcn: '10.0.80.0/20',
  subnets: {
    'control-plane': '10.0.80.128/25',
    'int-lb': '10.0.80.0/25',
    workers: '10.0.82.0/23',
    pods: '10.0.84.0/23',
  },
},
```

Overlay networking requires only these subnet keys:

```jsonnet
network: {
  vcn: '10.0.88.0/21',
  subnets: {
    'control-plane': '10.0.88.128/25',
    'int-lb': '10.0.88.0/25',
    workers: '10.0.90.0/23',
  },
},
```

Do not include `pods` in an overlay manual subnet map. Overlay pod addresses come from the Kubernetes overlay pod CIDR, not from an OCI pod subnet.

## **8. Generate the JSON Files**

Run the generator from the repository root:

```bash
bash gen/generate.sh --config /path/to/oke-config.jsonnet /path/to/generated-oke
```

Example:

```bash
bash gen/generate.sh --config ./oke-overlay-hub-a.jsonnet ./generated/oke-overlay-hub-a
```

The generated directory contains the JSON files to use with the OCI Landing Zone Orchestrator.

## **9. Review the Output**

The generated file set commonly includes:

| File | Purpose |
| --- | --- |
| `network.json` | Hub, spoke, platform, OKE VCNs, subnets, route tables, gateways, security lists, and NSGs. |
| `iam.json` | Compartments, groups, and policies. |
| `governance.json` | Tag namespaces and governance configuration. |
| `oke_clusters.json` | OKE cluster configuration. |
| `oke_workers.json` | OKE node pool configuration. |
| `security_cis*.json` | Security baseline configuration. |
| `observability_cis*.json` | Observability baseline configuration. |

Some hub models, including Hub A, also generate `network_pre.json`. This file is used for staged network deployment before the final `network.json`.

For native OKE, check that the worker node pool includes `pods_subnet_id` and `pods_nsg_ids`.

For overlay OKE, check that:

- `oke_clusters.json` requests Flannel in the downstream OKE cluster configuration.
- `oke_clusters.json` contains `pods_cidr` and `services_cidr`.
- `oke_workers.json` does not contain `pods_subnet_id` or `pods_nsg_ids`.
- `network.json` does not contain an OKE pod subnet, pod route table, pod security list, or pod NSG.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
