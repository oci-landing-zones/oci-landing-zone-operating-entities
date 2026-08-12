# OCI X-RPC Generator Guide

## Scope

This guide owns config-driven Remote Peering Connection (RPC) behavior under `gen/addons/oci-x-rpc/` and the shared RPC builders. Root `AGENTS.md` owns customer safety, normal One-OE discovery, artifact placement, and deployment defaults. Use this guide after RPC is in scope and before authoring either side of a peering design.

## Source Priority

1. `gen/config.libsonnet` for public input validation and normalization
2. `gen/builders/remote_peering.libsonnet` for RPC, DRG attachment, route table, distribution, and route-entry overlays
3. `gen/builders/iam/remote_peering_policies.libsonnet` for cross-tenancy policies
4. `gen/landing_zone.libsonnet` for dynamic environment/platform integration
5. `gen/addons/oci-x-rpc/published.libsonnet` for RPC-only verification projections and committed full reference surfaces
6. tests and Blueprint Factory examples in this repository

## Design Boundary

- One-OE owns the base DRG, hub, environments, platforms, IAM baseline, governance, security, and observability.
- RPC adds only the networking and optional cross-tenancy IAM delta required for remote peering.
- Do not generate an RPC governance fragment.
- Do not duplicate the base DRG or replace its existing route tables and distributions. Merge RPC attachments, RPC-specific route tables/distributions, import statements, and route rules into the generated One-OE network.
- Same-tenancy RPC emits no additional RPC IAM fragment. Existing One-OE network-administrator permissions remain the baseline.
- Cross-tenancy RPC emits only the requestor/acceptor policy surface required to establish the connection.

## Dynamic Topology

- Environment names and counts come from `config.environments`; never hardcode `prod`, `preprod`, `uat`, or a fixed environment count.
- Local routed VCNs are derived from every environment `shared_project_network` and every network-producing environment or shared platform.
- Extension-backed platform VCNs, including OKE VCNs, participate automatically through the normalized platform topology.
- Identity-only or otherwise networkless environments do not receive VCN routes or DRG attachments.
- A Landing Zone may own multiple named RPC connections. Build the full tenancy/region connection graph first, then create one config per Landing Zone and one `remote_peering_connections` entry per attached graph edge.
- A side cannot infer the peer side's topology from its own config. `remote_cidrs` must contain the reviewed remote routable VCN CIDRs, or reviewed non-overlapping aggregate CIDRs.
- Kubernetes service CIDRs and overlay pod CIDRs are not automatically RPC-routed VCN ranges. Include only ranges that the selected network design explicitly routes through the DRG.

## Required Discovery

After normal One-OE discovery is complete, collect these RPC decisions one at a time:

1. Tenancy/region nodes and every requested RPC connection between them
2. Same tenancy or cross tenancy for each connection
3. Region and short region name for each Landing Zone
4. Acceptor and requestor role assignment for each connection
5. Local hub model and all local network-producing environments/platforms for each Landing Zone
6. Whether each connection provides only peer access or approved transit to another connected Landing Zone
7. Remote routable CIDRs each side must reach
8. Acceptor RPC OCID or orchestrator dependency key for each requestor edge
9. For each cross-tenancy edge, requestor tenancy OCID, acceptor tenancy OCID, and the requestor network-administrator group OCID needed by the acceptor

Do not guess role, peer OCID, tenancy OCID, group OCID, region, or remote CIDRs.

## Config Contract

RPC connections live under top-level `remote_peering_connections`:

```jsonnet
remote_peering_connections: {
  tenancy1: {
    remote_cidrs: ['10.0.0.0/21', '10.0.64.0/21'],
    peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.example',
    peer_region_name: 'eu-frankfurt-1',
    peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor',
  },
},
```

- `remote_cidrs` is required and non-empty.
- `peer_id` is omitted on the acceptor and required on the requestor. It accepts an RPC OCID or orchestrator dependency key; non-OCID values render as `peer_key`.
- `peer_region_name` identifies the peer RPC region.
- Same-tenancy RPC omits both `peer_tenancy_ocid` and `requestor_group_ocid`.
- A cross-tenancy acceptor sets `peer_tenancy_ocid` to the requestor tenancy and sets `requestor_group_ocid` to the foreign requestor group. It omits `peer_id`.
- A cross-tenancy requestor sets `peer_tenancy_ocid` to the acceptor tenancy and sets `peer_id` to the acceptor RPC OCID or dependency key. It omits `requestor_group_ocid` because its policy references the local `'id_lz_common'/'grp-lz-network-admin'` group.
- Multiple entries generate independent RPC objects, attachments, routing surfaces, and cross-tenancy policies. Connection names must be unique within the Landing Zone config.

## CIDR Guardrails

- All local hub, environment, and platform VCN CIDRs must be non-overlapping.
- Every remote CIDR must be a canonical IPv4 CIDR.
- Remote CIDRs must not overlap any local routed VCN CIDR or another configured remote CIDR.
- Each side's `remote_cidrs` must be checked against the peer design. Do not assume a broad `/16` when the peer has smaller reviewed VCN ranges.
- Consider current and deliberate future network-producing environments/platforms during address planning.

## Role And IAM Mapping

| Scenario | Acceptor | Requestor |
|---|---|---|
| Same tenancy | Omit `peer_id`; no RPC IAM fragment | Set `peer_id`; no RPC IAM fragment |
| Cross tenancy | Omit `peer_id`; Define requestor tenancy/group and Admit `remote-peering-to` | Set `peer_id`; Define acceptor tenancy, Allow `remote-peering-from`, and Endorse `remote-peering-to` |

The user or automation principal that establishes the peering must be represented by the requestor group policy.

## Routing Behavior

- Every connection creates an RPC object and a DRG attachment using `REMOTE_PEERING_CONNECTION`.
- The base hub DRG import distribution receives an RPC import statement.
- Hub E creates an RPC import distribution containing the hub VCN attachment and every dynamically discovered local environment/platform VCN attachment.
- Hub E spoke and platform route tables receive explicit routes for every remote CIDR.
- Hub A, Hub B, and Hub C route RPC traffic through the common existing hub/firewall path. Hub E uses the direct DRG import-distribution path described above.
- The RPC builder does not invent or modify customer-specific Network Firewall security policy; the deployed policy must separately permit the approved traffic.
- RPC-only verification projections retain only RPC-related route rules, attachments, distributions, route tables, RPC objects, and cross-tenancy policies.

## Deployment Sequence

1. Generate and review one config per Landing Zone in the connection graph.
2. For cross tenancy, deploy requestor IAM first if the requestor group must be created and collect its group OCID.
3. Deploy each acceptor IAM and network; collect the RPC OCID for every connection.
4. Set each requestor `peer_id` to the corresponding RPC OCID, or supply the reviewed orchestrator dependency mapping.
5. Deploy requestor IAM and network updates.
6. Verify every RPC state, DRG learned/imported route, VCN route rule, firewall policy behavior, and approved traffic path, including transit only when it was explicitly requested.

## Publication And Verification

- `profiles.libsonnet` owns representative complete One-OE configs. The standard runtime profiles use a Frankfurt Hub A acceptor and an Amsterdam Hub B requester with `prod` and `preprod` networks.
- `published.libsonnet` renders the current One-OE generator. It exposes full governance, IAM, and network surfaces for runtime reference snapshots while retaining RPC-only network and IAM projections for verification.
- Runtime entrypoints must remain thin and select one complete governance, IAM, or network surface. Same-tenancy runtime publication selects network only.
- Generate repository snapshots with `bash gen/generate.sh`.
- Generate an end-user landing zone with `bash gen/generate.sh --config <config_file> <output_dir>`.
- Run `python3 -m unittest discover -s tests -p 'test_*.py'` after generator changes.
- Compare generated surfaces semantically with tested references: role, RPC object, attachment, route table/distribution, route rules, firewall path, IAM statements, region, hub kind, and environment CIDRs.

## Change Checklist

When changing the RPC contract, update the normalizer, builder, IAM module, profiles/publication adapter, config references, Blueprint Factory examples, agent guidance, tests, generated JSON, and add-on documentation in the same change.
