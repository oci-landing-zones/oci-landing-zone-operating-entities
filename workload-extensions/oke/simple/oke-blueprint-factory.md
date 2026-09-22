# OKE generation options <!-- omit from toc -->

- [**1. Overview**](#1-overview)
- [**2. Prerequisites**](#2-prerequisites)
- [**3. What `oke_simple` Means**](#3-what-oke_simple-means)
- [**4. Native OKE Example**](#4-native-oke-example)
- [**5. Overlay OKE Example**](#5-overlay-oke-example)
- [**6. OKE VCN Sizing**](#6-oke-vcn-sizing)
- [**7. Manual OKE Subnet CIDRs**](#7-manual-oke-subnet-cidrs)
- [**8. File Storage Support**](#8-file-storage-support)
- [**9. Generate the JSON Files**](#9-generate-the-json-files)
- [**10. Generated Output Contract**](#10-generated-output-contract)

## **1. Overview**

Use one of the supported Landing Zone add-on entry paths when the committed OKE JSON files do not match the required landing zone:

- [Blueprint Factory](../../../addons/oci-lz-blueprint-factory/README.md) for a directly authored and reviewed source configuration.
- [OCI LZ AI Agent](../../../addons/oci-lz-ai-agent/README.md) for AI-assisted discovery, source-configuration drafting, and review.

Both paths produce a reviewed source input and generated deployment package. They support custom CIDR ranges, multiple environments, multiple OKE platforms with one cluster per platform, and overlay networking.

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

`oke_simple` is the OKE workload extension type selected through either supported add-on. When a platform uses `extension.type: 'oke_simple'`, generation adds the OKE network, IAM, cluster, worker, security, and observability JSON needed for that platform.

This is different from the committed quickstart folders:

| Option | What it is | When to use it |
| --- | --- | --- |
| `oke_simple` | The OKE extension type. | Use this when generating a landing zone whose requirements are outside the committed quickstart configurations. |
| `simple/single-stack` | A committed OKE JSON package that deploys the landing zone and OKE together. | Use this for the standard Hub E single-stack deployment. |
| `simple/multi-stack` | A committed OKE JSON package that adds OKE to an existing landing zone. | Use this for the standard multi-stack deployment path. |

In either add-on path, use `oke_simple` for OKE platforms.

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
      project_network: {
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
              worker_boot_volume_size: 60,
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              public_load_balancer: true,
            },
          },
        },
      },
    },
  },
}
```

Native mode is the default. It creates an OCI pod subnet and wires the worker node pool with pod subnet and pod NSG references.

OKE compute and persistent-storage permissions target only the owning OKE platform compartment and require the requesting cluster compartment to equal the target resource compartment. A cluster resource principal from another OKE platform therefore cannot use those statements against this platform's instances, images, volumes, backups, or file systems. Platform-tag equality isolates existing public Hub LB resources and post-create Hub NSG attachment. Create the Service/LB with the Hub network compartment and Hub LB subnet annotations, but without a Hub NSG annotation. Wait for the endpoint to become active, then add the network-team-approved matching-tag Hub NSG annotation with security-rule management mode `None`. OKE can attach that existing Hub NSG and continue reconciliation, but cannot create or manage NSGs in the Hub. Initial creation with a Hub NSG is unsupported. This explicit Hub compartment selection is required when the OKE platform compartment is protected by a CIS2 Security Zone, because OCI rejects public LBs in that platform compartment. The separate environment-network policy retains cluster-principal LB/NLB and NSG lifecycle authority without TBAC, with movement excluded, for native worker/pod networking and private Services.

Direct OCI Certificates integration stores every certificate in the owning OKE platform compartment. The generated policy grants OKE cluster principals `manage leaf-certificate-family` in that compartment because narrower certificate and association permissions do not support OKE listener reconciliation. The platform compartment—not certificate resource tags—is the authorization boundary and must contain only certificates approved for that OKE platform. Certificates in the shared security compartment are not supported, and the grant does not include Certificate Authority administration.

The generator creates no Kubernetes certificate-renewal identity. For OCI LB termination, use an OCI-managed certificate or a security-owned external pipeline that updates an imported Let's Encrypt certificate. For automatic cert-manager renewal inside Kubernetes, terminate TLS in an approved ingress controller and use OCI LB TCP pass-through. Review the shared [operational and security notes](readme.md#operational-and-security-notes) before enabling public ingress.

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
      project_network: {
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
      project_network: {
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

Auto-subnet profiles are the default way to define OKE subnetting. The user provides the OKE VCN CIDR, and may optionally provide `cluster_size`; when `cluster_size` is omitted, the Blueprint Factory uses the `small` profile. The factory then creates the required OKE subnets.

The OKE VCN CIDR prefix must match the selected or defaulted size exactly:

| `cluster_size` | Required OKE VCN prefix |
| --- | --- |
| `small` | `/20` |
| `medium` | `/18` |
| `large` | `/16` |

With native networking, the Blueprint Factory creates these subnet sizes:

| `cluster_size` | Pod subnet | Worker subnet | Internal LB subnet | Optional FSS subnet | Control plane subnet |
| --- | --- | --- | --- | --- | --- |
| `small` | `/21` | `/23` | `/26` | `/26` | `/29` |
| `medium` | `/19` | `/22` | `/25` | `/25` | `/29` |
| `large` | `/17` | `/19` | `/24` | `/24` | `/29` |

With overlay networking, the Blueprint Factory creates these subnet sizes:

| `cluster_size` | Worker subnet | Internal LB subnet | Optional FSS subnet | Control plane subnet |
| --- | --- | --- | --- | --- |
| `small` | `/23` | `/26` | `/26` | `/29` |
| `medium` | `/22` | `/25` | `/25` | `/29` |
| `large` | `/19` | `/24` | `/24` | `/29` |

The FSS subnet is generated only when `create_fss: true`.

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

When `create_fss: true`, add `fss` to either manual subnet map:

```jsonnet
network: {
  vcn: '10.0.80.0/20',
  subnets: {
    'control-plane': '10.0.90.192/29',
    'int-lb': '10.0.90.0/26',
    workers: '10.0.88.0/23',
    pods: '10.0.80.0/21',
    fss: '10.0.90.128/26',
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

## **8. File Storage Support**

OCI File Storage support is disabled by default. Enable its network and IAM prerequisites in the OKE extension parameters:

```jsonnet
extension: {
  type: 'oke_simple',
  params: {
    kubernetes_version: 'v1.35.2',
    services_cidr: '10.96.0.0/16',
    api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
    create_fss: true,
  },
},
```

This adds:

- A private FSS subnet with a service-gateway-only route table.
- An FSS security list and NSG.
- Paired stateless NFS rules between the FSS and worker NSGs, plus the same rules between the FSS and pod NSGs in VCN-native mode for virtual-node access.
- Permission for the cluster principal to manage `file-family` resources in its OKE platform compartment.

The extension does not create a file system, mount target, export, Kubernetes `StorageClass`, or persistent volume claim. After deployment, create a mount target in the generated FSS subnet and associate the generated FSS NSG with it. Configure the OCI File Storage CSI StorageClass with that existing `mountTargetOcid` and the OKE platform `compartmentOcid`. The CSI provisioner then manages file systems and Kubernetes persistent volumes while the mount target remains infrastructure-managed.

See [Provisioning PVCs on the File Storage Service](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim_Provisioning_PVCs_on_FSS.htm) for the supported `fss.csi.oraclecloud.com` StorageClass parameters and provisioning workflow.

## **9. Generate the JSON Files**

Run the Blueprint Factory from the repository root:

```bash
bash gen/generate.sh --config /path/to/oke-config.jsonnet /path/to/generated-oke
```

Example:

```bash
bash gen/generate.sh --config ./oke-overlay-hub-a.jsonnet ./generated/oke-overlay-hub-a
```

The generated directory contains the JSON files to use with the OCI Landing Zone Orchestrator.

## **10. Generated Output Contract**

The generated file set commonly includes:

| File | Purpose |
| --- | --- |
| `network.json` | Hub, spoke, platform, OKE VCNs, subnets, route tables, gateways, security lists, and NSGs. Every platform with `public_load_balancer: true` receives its own tagged frontend NSG in the Hub VCN and Hub network compartment. |
| `iam.json` | Compartments, groups, and policies. |
| `governance.json` | Tag namespaces and governance configuration. |
| `oke_clusters.json` | OKE cluster configuration. |
| `oke_workers.json` | OKE node pool configuration. |
| `security_cis*.json` | Security baseline. For CIS2, this also includes the shared security-compartment Vault and one encryption key in each OKE platform compartment. CIS1 omits OKE Vault and CMEK resources. |
| `observability_cis*.json` | Observability baseline configuration. |

Some hub models, including Hub A, also generate `network_pre.json`. This file is used for staged network deployment before the final `network.json`.

Public frontend NSGs scale as one Hub network resource per opted-in OKE platform. Each NSG permits public TCP 80/443 and TCP egress only to its owning OKE VCN. The shared Hub IAM policy remains one seven-statement policy as platforms are added; a generated allowlist selects enabled source platforms and source-to-target platform tag comparison isolates public LB reconciliation and post-create NSG attachment. The network team owns NSG rules, tags, movement, deletion, and lifecycle. OKE receives only matching-tag membership permission in the Hub network compartment. Approval is cluster-to-NSG rather than Service-to-NSG, so the cluster may reuse an approved NSG on its other public LBs even if Kubernetes admission or RBAC is bypassed.

For native OKE, the generated worker node pool includes `pods_subnet_id` and `pods_nsg_ids`.

The top-level `cis_level` controls OKE encryption behavior as well as the selected security and observability files. For CIS2, each cluster's `encryption.kube_secret_kms_key_id` references its generated key in `security_cis2.json`, and the worker node pool uses the same key for boot-volume encryption with in-transit encryption enabled. The generator derives these configuration keys from the canonical landing-zone naming convention rather than accepting a customer-supplied OKE KMS-key option. The pinned Orchestrator resolves both references through `kms_dependency`; no key OCID or policy substitution is required. The shared Vault remains in the Landing Zone security compartment, while each HSM key is created in its owning OKE platform compartment. For CIS1, cluster and worker CMEK references and OKE Vault/key resources are omitted; worker boot volumes use OCI-managed encryption and in-transit encryption is disabled.

`worker_boot_volume_size` defaults to `60` GB and accepts an integer from `50` through `32768`. Worker initialization runs `oci-growfs` at both CIS levels so the root partition and filesystem consume the configured boot-volume size. It then fetches and executes the OKE-provided bootstrap script from instance metadata; this step must remain in custom worker initialization so nodes can join the cluster. CIS2 initialization also installs `oci-fss-utils` from the developer repository matching the node's runtime Oracle Linux major version (`ol8_developer` or `ol9_developer`). This prepares CIS2 workers for encrypted OCI File Storage mounts; CIS1 does not install the package.

For CIS2 deployment validation, confirm the Vault and key compartments, confirm that the cluster and node pool reference the same generated configuration key, and verify the three generated platform-compartment KMS statements before deployment. Worker boot-volume delegation is granted only to same-compartment node-pool principals. Confirm the Landing Zone baseline service policy supplies Block Storage key use. Persistent volumes use a separately governed key. For split stacks, pass the security-stack KMS dependency output to the OKE stack instead of replacing configuration keys with literal OCIDs or editing generated IAM.

The default worker image selector is `9\\.[0-9]+`.

For overlay OKE, the generator:

- Requests Flannel in the downstream OKE cluster configuration.
- Emits `pods_cidr` and `services_cidr` in `oke_clusters.json`.
- Omits `pods_subnet_id` and `pods_nsg_ids` from `oke_workers.json`.
- Omits the OKE pod subnet, pod route table, pod security list, and pod NSG from `network.json`.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
