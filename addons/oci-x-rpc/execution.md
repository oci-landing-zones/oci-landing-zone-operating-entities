# X-RPC Execution Guide

This guide covers the deployment sequence for the [runtime golden templates](./runtime/README.md) and for customer-specific output generated through [Blueprint Factory or the LZ Agent](./runtime/x-rpc-blueprint-factory.md).

## Before You Start

Confirm and review:

- Acceptor and requester roles for every RPC connection
- Local and peer tenancies, regions, and supported hub models
- Every local and remote routable VCN CIDR, with no overlaps
- Acceptor RPC OCID or orchestrator dependency key for each requester
- For cross tenancy, both tenancy OCIDs and the requester network-administrator group OCID
- OCI Network Firewall policy permits the approved traffic
- Customer-specific values have replaced every placeholder

Environment names and counts are dynamic in config-driven generation. The runtime golden templates use `prod` and `preprod` only as a stable reference topology.

## Firewall Hub Staging

The runtime examples use Hub A and Hub B. Both follow the standard two-stage OCI Network Firewall deployment:

1. Apply the matching One-OE pre-stage configuration to create the firewall resources.
2. Collect the firewall private IP OCIDs.
3. Update the final network template placeholders with those OCIDs.
4. Apply the final RPC-enabled network configuration.

Config-driven generation emits `network_pre.json` for this purpose. The runtime directory commits only the requested final golden network templates.

## Same-Tenancy Sequence

1. Review and adapt [`same_tenancy1_acceptor_network.json`](./runtime/same_tenancy1_acceptor_network.json).
2. Deploy the acceptor network and collect its RPC OCID.
3. Review and adapt [`same_tenancy2_requester_network.json`](./runtime/same_tenancy2_requester_network.json).
4. Set the requester RPC reference to the acceptor RPC OCID, or provide the reviewed orchestrator dependency mapping.
5. Deploy the requester network.
6. Validate RPC state, DRG routes, firewall policy, and traffic in both directions.

Same-tenancy RPC does not require additional cross-tenancy IAM or governance files.

## Cross-Tenancy Sequence

### 1. Establish The Requester Identity

Deploy or confirm the standard One-OE requester IAM baseline. Collect the OCID of the requester tenancy's `grp-lz-network-admin` group.

The requester RPC policy must reference its local identity-domain group as:

```text
'id_lz_common'/'grp-lz-network-admin'
```

Do not define the requester's local group by OCID in the requester policy.

### 2. Deploy The Acceptor

Review and adapt:

- [`cross_tenancy1_acceptor_governance.json`](./runtime/cross_tenancy1_acceptor_governance.json)
- [`cross_tenancy1_acceptor_iam.json`](./runtime/cross_tenancy1_acceptor_iam.json)
- [`cross_tenancy1_acceptor_network.json`](./runtime/cross_tenancy1_acceptor_network.json)

The acceptor must contain the requester tenancy OCID and foreign requester group OCID, and must omit `peer_id`. Deploy it and collect the created RPC OCID.

### 3. Deploy The Requester

Review and adapt:

- [`cross_tenancy2_requester_governance.json`](./runtime/cross_tenancy2_requester_governance.json)
- [`cross_tenancy2_requester_iam.json`](./runtime/cross_tenancy2_requester_iam.json)
- [`cross_tenancy2_requester_network.json`](./runtime/cross_tenancy2_requester_network.json)

The requester must contain the acceptor tenancy OCID and must reference the acceptor RPC by OCID or a valid dependency key. It must not contain `requestor_group_ocid`.

## Validate

Confirm all of the following:

1. The requester points to the expected acceptor RPC and peer region.
2. Both RPC resources reach the `PEERED` lifecycle state.
3. Each RPC has a `REMOTE_PEERING_CONNECTION` DRG attachment.
4. RPC route tables and import distributions contain the expected attachment references.
5. Every reviewed remote CIDR has the required DRG, VCN, and NSG routing surface.
6. Local and remote VCN CIDRs do not overlap.
7. The foreign requester group OCID appears only in the acceptor policy.
8. The requester policy uses the local identity-domain group name.
9. OCI Network Firewall policy permits the approved flows.
10. End-to-end traffic succeeds in both directions for approved ports and protocols.
