# Cross-Tenancy RPC Execution Guide

## Overview

This guide explains the execution order for establishing a cross-tenancy Remote Peering Connection (RPC) using Landing Zone JSON file sets.

The example role mapping is:

- **Acceptor tenancy**: Tenancy 1. Creates the acceptor RPC and admits the requestor group.
- **Requestor tenancy**: Tenancy 2. Creates the requestor RPC and connects to the acceptor RPC OCID.

The JSON files under [`runtime/`](runtime/) are generated representative fragments. Adapt them into the appropriate Landing Zone IAM and network JSON files before deployment.

## Execution Flow

1. Prepare the requestor IAM policy with the acceptor tenancy OCID.
2. Deploy or update requestor IAM so the requestor network administrator group exists.
3. Collect the requestor tenancy OCID and requestor group OCID.
4. Add the acceptor IAM fragment using the requestor tenancy OCID and requestor group OCID.
5. Add the acceptor network fragment and deploy the acceptor side.
6. Collect the acceptor RPC OCID.
7. Add the requestor network fragment and set `peer_id` to the acceptor RPC OCID.
8. Deploy the requestor network side.
9. Validate that the RPC status is `PEERED` and that the expected routes are active.

## Step 1 - Prepare Requestor IAM

Start with the requestor IAM fragment:

- [`runtime/cross_tenancy_requester_iam.json`](runtime/cross_tenancy_requester_iam.json)

Before deployment, set the acceptor tenancy reference in the requestor IAM policy. The requestor tenancy policy must:

- allow the requestor network administrator group to manage `remote-peering-from` in the local network compartment
- endorse that same group to manage `remote-peering-to` in the acceptor tenancy

After deployment, collect the requestor network administrator group OCID.

## Step 2 - Deploy Acceptor IAM and Network

Use these acceptor fragments:

- [`runtime/cross_tenancy_acceptor_iam.json`](runtime/cross_tenancy_acceptor_iam.json)
- [`runtime/cross_tenancy_acceptor_network.json`](runtime/cross_tenancy_acceptor_network.json)

Before deployment, set:

- requestor tenancy OCID
- requestor network administrator group OCID
- remote CIDR ranges that must be reachable through the RPC

The acceptor IAM policy must admit the requestor group to manage `remote-peering-to` in the acceptor network compartment. After the acceptor network deployment succeeds, collect the acceptor RPC OCID.

## Step 3 - Deploy Requestor Network

Use the requestor network fragment:

- [`runtime/cross_tenancy_requester_network.json`](runtime/cross_tenancy_requester_network.json)

Before deployment, set:

- `peer_id` to the acceptor RPC OCID
- `peer_region_name` to the acceptor region
- remote CIDR ranges that must be reachable through the RPC

Deploy the requestor network side after the acceptor RPC exists.

## Step 4 - Validate Connectivity

After both sides are deployed, verify:

- RPC status is `PEERED`
- DRG remote peering attachments exist on both sides
- DRG route tables include the expected remote CIDR routes
- VCN route tables send remote CIDR traffic to the DRG
- firewall policy address lists and rules include the remote CIDRs when the design uses a firewall
- application-level reachability works between the expected source and destination subnets

> [!IMPORTANT]
> The Terraform or ORM automation principal must be covered by the RPC policy statements. If not, the RPC may fail to peer or may show a revoked authorization state.
