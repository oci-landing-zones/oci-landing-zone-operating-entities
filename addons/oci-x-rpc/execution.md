# X-RPC Execution Guide

This guide describes how to generate and deploy an RPC extension from the current One-OE generator. It does not deploy the compact files under `runtime/` as standalone Landing Zones.

## Before You Start

Prepare one source config per Landing Zone and confirm:

- Acceptor and requestor roles for every RPC edge
- Local and peer regions
- Reviewed, non-overlapping remote VCN CIDRs
- Same-tenancy or cross-tenancy scope
- Acceptor RPC OCID or orchestrator dependency key for each requestor
- For cross tenancy, both tenancy OCIDs and the requestor network-administrator group OCID
- Existing firewall policy permits the approved traffic when a firewall hub is used

Environment names and counts are customer-defined. The generator derives every local network-producing environment and platform VCN from its source config.

## Same-Tenancy Sequence

1. Add an acceptor entry without `peer_id` and without cross-tenancy IAM fields.
2. Generate and deploy the complete acceptor One-OE outputs.
3. Collect the acceptor RPC OCID.
4. Add a requestor entry with that RPC OCID, or a valid orchestrator dependency key.
5. Generate and deploy the complete requestor One-OE outputs.
6. Validate the RPC state and routes on both DRGs.

Same-tenancy RPC changes only the generated network configuration. It does not add IAM or governance fragments.

## Cross-Tenancy Sequence

### 1. Establish The Requestor Identity

Deploy the standard One-OE requestor IAM baseline if it is not already present. Collect the OCID of the requestor tenancy's `grp-lz-network-admin` group.

The requestor RPC policy references this local identity-domain group by name:

```text
'id_lz_common'/'grp-lz-network-admin'
```

Do not define that local group by OCID in the requestor policy.

### 2. Generate And Deploy The Acceptor

Configure the acceptor with:

- Reviewed requestor VCN CIDRs in `remote_cidrs`
- Requestor region in `peer_region_name`
- Requestor tenancy OCID in `peer_tenancy_ocid`
- Foreign requestor group OCID in `requestor_group_ocid`
- No `peer_id`

Generate the complete acceptor output set:

```bash
bash gen/generate.sh \
  --config addons/oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json \
  /tmp/xrpc-acceptor
```

Review and deploy the generated acceptor IAM and network changes, then collect the created RPC OCID.

### 3. Generate And Deploy The Requestor

Configure the requestor with:

- Reviewed acceptor VCN CIDRs in `remote_cidrs`
- Acceptor RPC OCID or dependency key in `peer_id`
- Acceptor region in `peer_region_name`
- Acceptor tenancy OCID in `peer_tenancy_ocid`
- No `requestor_group_ocid`

Generate the complete requestor output set:

```bash
bash gen/generate.sh \
  --config addons/oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json \
  /tmp/xrpc-requestor
```

Review and deploy the generated requestor IAM and network changes.

When the orchestrator resolves a dependency key, ensure its network dependency maps the key to the acceptor RPC `id` and `region_name`.

## Validate

Confirm all of the following before declaring the connection ready:

1. The requestor RPC points to the expected acceptor RPC and peer region.
2. Both RPC resources reach the `PEERED` lifecycle state.
3. Each RPC has a `REMOTE_PEERING_CONNECTION` DRG attachment.
4. RPC route tables and import distributions contain the expected attachment references.
5. Every reviewed remote CIDR has the required DRG, VCN, and NSG route surface.
6. No local or remote VCN CIDRs overlap.
7. Cross-tenancy policy statements use the foreign group OCID only on the acceptor and the local identity-domain group name on the requestor.
8. Firewall policy permits the approved flows when a firewall hub is present.
9. End-to-end traffic succeeds in both directions for the approved ports and protocols.

## Runtime References

The [`runtime/`](./runtime/) directory contains six generated RPC-only reference fragments:

- [`same_tenancy_acceptor_network.json`](./runtime/same_tenancy_acceptor_network.json)
- [`same_tenancy_requester_network.json`](./runtime/same_tenancy_requester_network.json)
- [`cross_tenancy_acceptor_network.json`](./runtime/cross_tenancy_acceptor_network.json)
- [`cross_tenancy_acceptor_iam.json`](./runtime/cross_tenancy_acceptor_iam.json)
- [`cross_tenancy_requester_network.json`](./runtime/cross_tenancy_requester_network.json)
- [`cross_tenancy_requester_iam.json`](./runtime/cross_tenancy_requester_iam.json)

These files are working reference samples for establishing RPC and reviewing the generated delta. They intentionally omit complete One-OE and governance configuration.
