# OKE Generator Guide

## Scope

This guide applies to repo-development and customer-guidance work that depends on the OKE generator used by the Blueprint Factory and OCI LZ AI Agent add-ons under `gen/workload-extensions/oke/`.

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
- CIS1 sample node pools omit `node_config_details.encryption`, leaving boot-volume encryption on OCI-managed keys with in-transit encryption disabled. CIS2 node pools enable boot-volume encryption in transit and use their cluster-specific generated key as `node_config_details.encryption.kms_key_id`.
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
- `oke_simple` is supported only under `environments.<environment>.platforms`. Placement under `shared_platforms` is rejected.
- `oke_simple` uses the normalized top-level `cis_level`; it does not expose a separate OKE CIS or KMS-key option.
- CIS2 clusters use a customer-managed key for Kubernetes secrets encryption. CIS1 clusters omit the CMEK reference.
- In CIS2 composition, the extension contributes the generic shared security Vault, `VLT-LZ-SHARED-SECURITY-KEY`, in `CMP-LZ-SECURITY-KEY` and creates one HSM key per cluster in that cluster's OKE platform compartment. The Vault entry merges with the baseline CIS2 shared security Vault. Each supported platform compartment contains one cluster and one cluster-specific key, and must not contain unrelated keys. CIS1 security output does not contain an OKE Vault or key. For committed OKE artifacts only, `oke_identity.json` is rendered from CIS2 while cluster, worker, network, governance, security, observability, and every other JSON are rendered from CIS1. Config-driven generation continues to use the selected top-level CIS level consistently.
- For CIS2, cluster `encryption.kube_secret_kms_key_id` references the cluster-specific generated key by configuration key; the key is derived from the canonical naming library and the Orchestrator resolves it through `kms_dependency`.
- Every CIS2 OKE platform security policy contains three compartment-scoped KMS statements: security administrators manage keys; the cluster uses keys for Kubernetes-secret encryption; and the node-pool principal uses `key-delegate` for worker boot volumes. The cluster and node-pool statements require principal/target compartment equality rather than a platform tag. The generator emits only the conditioned node-pool grant and does not emit the broader OKE service `key-delegates` grant. The Landing Zone baseline service policy already grants Block Storage key use, so the extension does not duplicate it. Persistent volumes must use a separately governed key and are not delegated through the OKE Kubernetes-secret key policy. The statements must not contain key OCIDs, `target.key.id`, or target-key tag authorization. CIS1 omits the OKE key and all three statements.
- Direct OKE integration with OCI Certificates is supported at both CIS levels when `public_load_balancer` is enabled, and only for certificates stored in the owning OKE platform compartment. The generated policy grants cluster principals `manage leaf-certificate-family` in that compartment; it does not emit narrower leaf-certificate read/use or association grants. The compartment, not a certificate resource tag, is the target-resource authorization boundary and must contain only certificates approved for that OKE platform. The grant includes leaf-certificate, version, bundle, CA-bundle, and association lifecycle, but excludes the broader `certificate-authority-family`. The generator emits no Kubernetes workload identity or certificate-renewal policy.
- `config_params.public_load_balancer` is a boolean and defaults to `false`. When `true`, the generator creates one platform-tagged frontend NSG in the Hub VCN and Hub network compartment through network-team-controlled IaC. The platform receives the narrowly scoped Hub-network permissions needed for Kubernetes `Service` objects of type `LoadBalancer` to create a public **OCI Load Balancer** with an IPv4 address and to attach an existing NSG only when its `platform` tag matches the cluster platform tag. The NSG permits public TCP 80/443 and TCP egress only to the owning OKE VCN. In the Hub scope, OKE receives no NSG creation, lifecycle, rule-management, tag-update, move, delete, or VCN-administration permission. This restriction does not remove the separate environment-network LB/NLB and NSG lifecycle contract used by native worker/pod networking and private Services.
- Cross-compartment OKE policies are consolidated by target scope: one Hub policy, one tag-namespace policy, and one network policy per network compartment. Existing-resource update/delete reconciliation requires equality between the requesting compartment's `platform` tag and the target endpoint's `platform` tag, and move remains excluded. Private environment-network LB/NLB reconciliation remains supported; the Hub policy supports only public OCI Load Balancers. The public Service must first create the LB in the Hub network compartment and Hub LB subnet, without an NSG annotation, and wait for it to become active. It may then declare a network-team-approved, matching-tag NSG with security-rule management mode `None`; initial creation with an NSG and CCM NSG management mode are unsupported because target-tag restriction is enforceable only during post-create attachment. Explicit Hub compartment selection is required when CIS2 places the OKE platform compartment in a Security Zone that rejects public LBs.
- Public frontend NSGs scale as one generated Hub network resource per opted-in platform. The shared Hub policy remains one policy with seven statements; adding platforms extends source allowlists but does not add Hub policies or statements. Single-stack output merges the NSGs into the Hub VCN. Multi-stack output uses `inject_into_existing_vcns` and resolves the Hub VCN configuration key through Orchestrator `network_dependency`, without a literal VCN OCID.
- The generator creates the Landing Zone-owned `tagns-lz-oke` namespace with only the `platform` key. The OKE platform compartment supplies the cluster-principal tag, service-created LBs and NLBs receive the target tag through `options.service_lb_config`, and the generated Hub frontend NSG receives it through network-team-controlled IaC. The extension does not tag internal OKE NSGs or the cluster KMS key because their IAM contracts are compartment-scoped or otherwise not tag-constrained. IAM, not Kubernetes admission or RBAC, is the authorization boundary: the membership grant requires an opted-in cluster platform and equality with the target NSG platform tag. Approval is cluster-to-NSG rather than Service-to-NSG, so an approved matching-tag NSG can be reused on other LBs owned by that cluster. Any broader cluster NSG permission defeats this model.
- The generated Hub NSG membership policy permits post-create attachment only when the requesting cluster compartment and target NSG have the same `tagns-lz-oke.platform` value. Untagged and nonmatching NSGs are outside this grant. The Hub lifecycle policy covers OCI Load Balancers only. When the shared Hub public-LB policy exists, its public-IP, private-IP, and floating-IP statements apply to every cluster principal without platform-tag conditions; LB lifecycle, Hub subnet/VCN access, and NSG membership retain their separate platform restrictions.
- Kubernetes Secret TLS uses LB-local certificate objects covered by `LOAD_BALANCER_UPDATE`. Direct OCI Certificates integration stores every certificate in its owning OKE platform compartment, which bounds the required `manage leaf-certificate-family` grant. Do not grant the broader `certificate-authority-family`, Vault secret, or generic VCN permissions. Public Hub LB lifecycle and private environment-network LB/NLB lifecycle use broad `manage` statements with source/target platform matching for existing resources and an explicit compartment-move exclusion.
- Let's Encrypt is supported through cert-manager when TLS terminates in a compatible in-cluster ingress controller. The public OCI LB then uses TCP pass-through. OCI-managed certificates can terminate TLS at OCI LB and are renewed by OCI Certificates. Imported Let's Encrypt certificates can terminate TLS at OCI LB only when a security-owned external automation pipeline updates OCI Certificates; Kubernetes and OKE do not perform that renewal. Certificates in the shared security compartment are not supported by the generated OKE certificate policy. An in-place cert-manager Secret update must not be documented as automatically rotating an OCI Load Balancer certificate.
- OKE-created compute instances, volumes, dynamic volume backups, and dynamically provisioned file systems default to the OKE platform compartment, which also contains the cluster and managed node pool. OKE service compute, storage, certificate, and KMS statements require `request.principal.compartment.id = target.compartment.id`; they do not use the platform tag inside that compartment.
- At both CIS levels, the generated platform compute policy grants the OKE service and same-compartment `nodepool` principals `use compute-capacity-reservations` in the owning OKE platform compartment; the OKE administrator policy grants the platform administrator group the same `use` permission. The extension does not grant reservation lifecycle management and does not create or select a reservation.
- KMS authorization relies on the dedicated OKE platform compartment, not the inventory tag on the key. A different CMEK for an OKE volume is outside the one-key-per-platform contract and requires a separate design review.
- OKE category policies are attached to the compartment that owns their resources and use that compartment's short name in their statements. Platform-compartment policies remain per platform and use principal/target compartment equality. Each environment network policy retains cluster-principal NSG lifecycle permissions without TBAC, with NSG movement excluded, for native worker/pod networking and private Service operation. Public frontend NSGs remain Hub-owned and network-team-managed; OKE receives only the shared Hub post-create membership grant with source-to-target platform-tag equality. Private environment-network LB/NLB policies and the public Hub LB policy use generated source-platform allowlists and source-to-target platform-tag comparison so statement counts remain constant. Hub IP statements apply to all cluster principals without platform tags; spoke private-IP use remains scoped to cluster principals in the network compartment.
- Keep concise customer operational and security guidance in `workload-extensions/oke/simple/readme.md`. Do not split it into additional OKE operational documents; retain generator invariants and modification guardrails in this guide.

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
