# OKE Generator Guide

## Scope

This guide applies to repo-development and customer-guidance work that depends on the config-driven OKE generator under `gen/workload-extensions/oke/`.

Root `AGENTS.md` owns customer safety, landing-zone discovery, and deployment defaults. Use this guide after OKE is in scope, before recommending OKE-native CIDRs, answering whether the extension is native or overlay, or changing the `oke_simple` contract.

## Source Priority

When OKE networking semantics are in question, use sources in this order:

1. this repo's generator source under `gen/workload-extensions/oke/simple/`
2. the downstream module contract consumed by this repo
3. tests and examples in this repo
4. current official Oracle OKE documentation
5. non-authoritative blogs or examples

Use official Oracle docs to verify current OCI service behavior, but do not let online sources silently override the repository contract for what this landing zone framework emits or recommends. If official docs appear to conflict with the repo contract, state the conflict and verify the downstream module contract before advising.

Do not let non-authoritative examples override this repo's contract or official Oracle docs for current OKE-native semantics.

For published OKE deployment investigations, inspect the exact orchestrator tag referenced by the published OKE docs rather than `HEAD`, then trace the downstream `cis-oke` module contract from there.

## Current Repo Contract

- `oke_simple` supports two network shapes through `config_params.cni_type`: `native` and `overlay`.
- `cni_type` defaults to `native`.
- `config_params.cni` is the downstream OKE cluster CNI request. It defaults from `cni_type`: `vcn_native` for native and `flannel` for overlay.
- Native network shape requires `cni: 'vcn_native'`.
- Overlay network shape currently requires `cni: 'flannel'`.
- Do not use `flannel` as a workload-extension `config_params.cni_type`; `cni_type` is the workload-extension network shape and only accepts `native` or `overlay`.
- For native, the generator creates and wires a dedicated pod subnet in the OKE VCN through `pods_subnet_id`.
- For overlay, the generator does not emit pod subnet, pod route table, pod security list, pod NSG, worker `pods_subnet_id`, or worker `pods_nsg_ids`.
- `oke_simple` defaults `worker_image` to the OL9 family selector `'9\\.[0-9]+'`, which the generator emits as `node_config_details.image`. The downstream OKE module inserts this value into its Oracle Linux image-name regular expression, so newer OL9 minor releases can be selected without matching OL8 images.
- Every generated sample node pool enables boot-volume encryption in transit and uses its cluster-specific generated key as `node_config_details.encryption.kms_key_id`.
- `services_cidr` remains the explicit Kubernetes service CIDR in the repo's standard native examples and is emitted under `options.kubernetes_network_config` in the cluster payload consumed by `cis-oke`.
- `pods_cidr` is not required for the standard native `oke_simple` path, but if a config explicitly sets it the generator preserves it under `options.kubernetes_network_config` as a passthrough to the downstream `cis-oke` module.
- For overlay, `pods_cidr` defaults to `10.244.0.0/16` and is emitted under `options.kubernetes_network_config`.
- Do not make `pods_cidr` mandatory again for the native `oke_simple` path unless the downstream module contract truly requires it.
- `config_params.cluster_size` is optional and currently supports `small`, `medium`, and `large`.
- If `cluster_size` is omitted and no manual `platform.network.subnets` map is provided, the extension uses the `small` auto-subnet profile.
- The OKE platform VCN prefix must exactly match the selected or defaulted size: `small` requires `/20`, `medium` requires `/18`, and `large` requires `/16`.
- `cluster_size` cannot be used together with `platform.network.subnets`. With `cluster_size`, the extension owns the fixed subnet layout for the OKE platform VCN.
- For new customer-facing config examples, prefer the auto-subnet profiles as the normal subnetting path. Use manual `platform.network.subnets` only when the profile layouts do not fit the required address plan.
- Manual native subnet maps must include exactly `control-plane`, `int-lb`, `workers`, and `pods`. Manual overlay subnet maps must include exactly `control-plane`, `int-lb`, and `workers`.
- Every `oke_simple` cluster uses a customer-managed key for Kubernetes secrets encryption.
- The extension contributes the generic shared security Vault, `VLT-LZ-SHARED-SECURITY-KEY`, in `CMP-LZ-SECURITY-KEY` and creates one HSM key per cluster. In combined CIS2 composition, this entry merges with the baseline shared security Vault. A separately deployed multi-stack extension creates the generically named Vault in its own state because the current downstream dependency contract cannot import that Vault definition.
- Cluster `encryption.kube_secret_kms_key_id` references the cluster-specific generated key by configuration key; the Orchestrator resolves that key through `kms_dependency`.
- Cluster and node pool KMS IAM permissions are limited to `cmp-landingzone:cmp-lz-security`. Exact `target.key.id` restrictions are not emitted because the current downstream Vault module cannot substitute generated key OCIDs into `any-user` principal statements.
- OKE cluster principals can manage `certificate-authority-family` only in the shared Landing Zone security compartment; the generator does not define a separate certificate compartment.
- OKE-created volumes, dynamic volume backups, and dynamically provisioned file systems default to the OKE platform compartment, which also contains the cluster and managed node pool. The OKE service storage policy scopes `volume-backups`, `volumes`, and `file-family` permissions to that compartment.
- The shared OKE security policy allows the Block Storage service to use keys throughout `cmp-lz-security`. The statement is intentionally not constrained to the generated cluster key because OKE persistent volumes can use different customer-managed keys.
- The shared OKE hub-network policy is attached to `CMP-LZ-NETWORK-KEY` and scopes public IP, private IP, floating IP, NSG, VCN, Load Balancer, and Network Load Balancer permissions to `cmp-lz-network`, where the hub VCN and its public load-balancer subnet live. Every statement is restricted to OKE cluster principals.
- OKE category policies are attached to the compartment that owns their resources and use that compartment's short name in their statements. Shared security and tagging grants are emitted once rather than once per cluster. Tenancy-wide public/floating IP and tagging statements remain in clearly named root policies.

## Auto-Subnet Profiles

When `cluster_size` is set, or when it defaults to `small`, OKE subnet CIDRs are allocated from the platform VCN in a fixed order.

Native profiles:

| Size | VCN prefix | Allocation order and subnet prefixes |
| --- | --- | --- |
| `small` | `/20` | pods `/21`, workers `/23`, int-lb `/26`, control-plane `/29` |
| `medium` | `/18` | pods `/19`, workers `/22`, int-lb `/25`, control-plane `/29` |
| `large` | `/16` | pods `/17`, workers `/19`, int-lb `/24`, control-plane `/29` |

Overlay profiles:

| Size | VCN prefix | Allocation order and subnet prefixes |
| --- | --- | --- |
| `small` | `/20` | workers `/23`, int-lb `/26`, control-plane `/29` |
| `medium` | `/18` | workers `/22`, int-lb `/25`, control-plane `/29` |
| `large` | `/16` | workers `/19`, int-lb `/24`, control-plane `/29` |

## CIDR Planning Rules

- Distinguish OCI VCN/subnet CIDRs from Kubernetes-internal CIDRs.
- For the native OKE contract in this repo, pod IPs come from the pod subnet inside the OKE VCN.
- For the overlay OKE contract in this repo, pod IPs come from the Kubernetes overlay pod CIDR, not from an OCI pod subnet. The overlay `pods_cidr` must not overlap the OKE VCN, subnets, `services_cidr`, routed external networks, or other Kubernetes-internal ranges that must communicate.
- `services_cidr` must be planned separately and must not overlap the OKE VCN or its subnets.
- If the landing zone connects to on-premises or other clouds, OCI-routed ranges must not overlap those external networks.
- Do not present an exact OKE CIDR split as "guaranteed" unless the sizing assumptions are explicit.

Ask for or state the assumptions that affect sizing:

- number of clusters
- expected node count per cluster
- expected pod density and growth headroom
- routed external networks that must avoid overlap

If those assumptions are missing, present the CIDRs as an example or starting point, not as a guaranteed final design.

## Guardrails

- If official Oracle docs and the repo contract appear inconsistent, stop and verify the downstream module contract before recommending deployment values.
- For native OKE questions, do not infer overlay semantics from `pods_cidr` passthrough examples.
- For overlay OKE questions, do not add or require pod OCI subnets unless the contract changes.
- When multiple OKE platforms are generated, each OKE VCN route table must reference only gateways in that same VCN for NAT and service gateway routes.
- When changing the OKE contract, update the generator, fixtures, tests, published JSON, and OKE docs in the same change.
