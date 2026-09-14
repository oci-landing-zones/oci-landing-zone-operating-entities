# DR RPC ownership design

**Date:** 2026-09-14  
**Status:** Approved for implementation planning

## Objective

Move the implementation that constructs Remote Peering Connection (RPC) network
overlays out of the DR add-on and into the X-RPC add-on, while preserving every
published DR JSON file byte for byte.

## Ownership boundary

The DR add-on continues to own:

- the home/DR pair contract and validation in `gen/dr_pair.libsonnet`;
- the DR multi-output orchestration in `gen/landing_zone_dr_multi.jsonnet`;
- DR profiles and thin published runtime entrypoints;
- the generated DR JSON snapshots and DR documentation.

The X-RPC add-on owns:

- construction of RPC objects and DRG attachments;
- RPC route tables and import distributions;
- hub-specific RPC route behavior;
- requester/acceptor RPC network projections.

This change does not replace the current config-driven X-RPC builder. X-RPC will
temporarily expose two contracts because they serve different publication needs:

1. `gen/builders/remote_peering.libsonnet` remains the dynamic, multi-connection
   builder used by top-level `remote_peering_connections` configs.
2. `gen/addons/oci-x-rpc/dr_pair_network.libsonnet` preserves the established DR
   pair publication contract exactly.

Keeping the compatibility contract explicit avoids changing established DR keys,
route selection, priorities, or formatted output merely to force both consumers
through one higher-level API.

## Shared DR-pair RPC API

`gen/addons/oci-x-rpc/dr_pair_network.libsonnet` will expose:

- `requester(local_side, peer_side, final_network)`;
- `acceptor(local_side, peer_side, final_network)`;
- hidden implementation helpers used by focused tests where needed.

The requester and acceptor methods retain the current role mapping:

| Projection | Local role | Peer role | Peer reference |
|---|---|---|---|
| requester | `HOME` | `DR` | `peer_key` present |
| acceptor | `DR` | `HOME` | no `peer_key` |

The implementation must preserve:

- all RPC, attachment, route table, distribution, statement, and route-rule keys;
- `DRG_ATTACHMENT_ID` matching for the established DR RPC distributions;
- advertised-VCN resolution and exact local-CIDR validation;
- firewall egress route-table selection for Hub A, Hub B, and Hub C;
- direct routing behavior for Hub E in custom DR config mode;
- requester/acceptor priorities and display names;
- object shape and formatter-visible ordering.

Hub E remains supported by the generic One-OE/Factory and custom same-hub DR
config machinery. It remains excluded from the published DR preset, as
established by the preceding change. Every DR pair must use the same hub model in
both regions.

## Source migration

The following implementations will be consolidated into
`gen/addons/oci-x-rpc/dr_pair_network.libsonnet` and then removed from DR:

- `gen/addons/oci-lz-dr/one-oe/rpc_common.libsonnet`;
- `gen/addons/oci-lz-dr/one-oe/rpc_hub_adapter.libsonnet`;
- `gen/addons/oci-lz-dr/one-oe/rpc_requester.libsonnet`;
- `gen/addons/oci-lz-dr/one-oe/rpc_acceptor.libsonnet`.

DR runtime entrypoints and `gen/landing_zone_dr_multi.jsonnet` will import the
X-RPC compatibility API directly. They remain thin publication/orchestration
surfaces and do not regain RPC construction logic.

## Verification strategy

Before moving implementation, add a characterization test that renders every DR
runtime Jsonnet source through the canonical `jsonnet` renderer and the repository
formatter, then compares the result as text with its checked-in JSON counterpart.
This makes byte-for-byte equality an automated contract.

The migration is accepted only when:

- the characterization test passes without updating any DR JSON snapshot;
- focused DR RPC fixtures preserve keys, roles, priorities, attachment-scoped
  matches, remote destinations, and hub routing behavior;
- all generator tests pass with canonical `jsonnet`;
- focused compatibility checks pass with `jrsonnet` without an unbounded run;
- `bash gen/generate.sh` produces no DR JSON diff;
- `git diff --check` passes.

## Non-goals

- No public config schema changes.
- No changes to `disaster_recovery.rpc` inputs.
- No changes to the config-driven `remote_peering_connections` behavior.
- No IAM, governance, security, or observability changes.
- No new Hub E option in the published DR preset.
- No broad refactor of routing or naming code.

## Rollback

The migration is source-only. If exact output parity cannot be demonstrated, keep
the four existing DR modules and discard the new X-RPC compatibility module and
import changes. Published JSON must not be regenerated to hide a behavior change.
