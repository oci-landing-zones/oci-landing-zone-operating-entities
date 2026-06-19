# **[OCI Remote Peering Connections](#)**
## **An OCI Open LZ [Addon](#) for Remote Peering Across Regions and Tenancies using IaC**
&nbsp;

## **Overview**

The IaC-driven configuration enables connectivity between two regions in the same tenancy and across multiple tenancies. It includes the RPC resources, route updates, and, for cross-tenancy peering, the IAM policies required to request and accept the peering connection.

This document provides configuration views for the following use cases:

- Multi-Tenancy-RPC: Establishes a remote peering connection across OCI tenancies.
- Single-Tenancy-RPC: Establishes a remote peering connection between two OCI regions in the same tenancy.

The JSON files under [`runtime/`](runtime/) are generated representative fragments. They show the RPC-related network and IAM changes that operators can adapt into an existing Landing Zone JSON file set.

&nbsp;

### OCI RPC Resources

| Resource | Description |
| - | - |
| [IAM Policies](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-iam.htm#scenario_m__IAM_cross-tenancy) | Cross-tenancy RPC requires policies that allow one tenancy to request and the other tenancy to accept the peering. Same-tenancy RPC does not require additional cross-tenancy policy statements. |
| [Remote Peering Connection (RPC)](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-rpc-create.htm#drg-rpc-create) | An RPC is created on each side and attached to the local DRG. One side accepts the connection, and the other side requests it. |

### Requestor and Acceptor Roles

The **acceptor** creates the RPC that waits for the remote connection. In cross-tenancy RPC, the acceptor tenancy also admits the requestor tenancy group to manage `remote-peering-to` in the network compartment. The acceptor side is applied before the requestor network side and shares the acceptor RPC OCID.

The **requestor** connects to the acceptor RPC. It sets `peer_id` to the acceptor RPC OCID. In cross-tenancy RPC, the requestor tenancy allows its network administrator group to manage `remote-peering-from` locally and endorses that group to manage `remote-peering-to` in the acceptor tenancy.

The runtime examples use **Tenancy 1** as the acceptor side and **Tenancy 2** as the requestor side. In same-tenancy peering, the same operations team may own both sides; the role names still describe connection direction.

&nbsp;

## 1. Single Tenancy Multi-Region

Configuration details:

- Region A creates an acceptor RPC.
- Region B creates a requestor RPC pointing to the Region A acceptor RPC.
- No cross-tenancy IAM policy is required.

<img src="images/s-tenancy.png" width="900" height="value">

### Sample JSON Configuration

- Region A acceptor network fragment: [`runtime/same_tenancy_acceptor_network.json`](runtime/same_tenancy_acceptor_network.json)
- Region B requestor network fragment: [`runtime/same_tenancy_requester_network.json`](runtime/same_tenancy_requester_network.json)

### Steps to Set Up Multi-Region RPC

#### Configuration Update & Execution in Region A

***Step 1: Add the Remote Peering Connection (RPC) Block***<br>
Modify the Region A network JSON configuration by adding the acceptor RPC and related DRG route updates from [`runtime/same_tenancy_acceptor_network.json`](runtime/same_tenancy_acceptor_network.json).

***Step 2: Execute the Terraform Deployment***<br>
Plan and apply the updated Region A network configuration. Collect the acceptor RPC OCID after successful deployment.

#### Configuration Update & Execution in Region B

***Step 1: Add the Remote Peering Connection (RPC) Block***<br>
Modify the Region B network JSON configuration by adding the requestor RPC and related route updates from [`runtime/same_tenancy_requester_network.json`](runtime/same_tenancy_requester_network.json). Set `peer_id` to the acceptor RPC OCID collected from Region A.

***Step 2: Execute the Terraform Deployment***<br>
Plan and apply the updated Region B network configuration. Verify that the RPC connection reaches the `PEERED` state and that routing works as expected.

> [!NOTE]
> Since this is within the same tenancy across multiple regions, no additional cross-tenancy RPC IAM policy is required.

&nbsp;

## 2. Multi-Tenancy-RPC

Configuration details:

- The acceptor tenancy creates the acceptor RPC and cross-tenancy acceptor IAM policy.
- The requestor tenancy creates the requestor RPC and cross-tenancy requestor IAM policy.
- The requestor tenancy OCID and network administrator group OCID must be shared with the acceptor tenancy operators before the acceptor IAM policy can be applied.

<img src="images/x-tenancy.png" width="900" height="value">

### Sample JSON Configuration

- Acceptor IAM fragment: [`runtime/cross_tenancy_acceptor_iam.json`](runtime/cross_tenancy_acceptor_iam.json)
- Acceptor network fragment: [`runtime/cross_tenancy_acceptor_network.json`](runtime/cross_tenancy_acceptor_network.json)
- Requestor IAM fragment: [`runtime/cross_tenancy_requester_iam.json`](runtime/cross_tenancy_requester_iam.json)
- Requestor network fragment: [`runtime/cross_tenancy_requester_network.json`](runtime/cross_tenancy_requester_network.json)

> [!NOTE]
> The requestor tenancy owns the group that requests the connection. The acceptor tenancy admits that requestor group. Keep the requestor tenancy OCID, requestor group OCID, and acceptor RPC OCID as separate values.

### Cross-Tenancy RPC Execution Guide

> [!TIP]
> Refer to the [Cross-Tenancy RPC Execution Guide](./execution.md) for deployment order, required OCID handoff, and validation steps.

> [!IMPORTANT]
> The user or automation principal performing Terraform must be allowed by the RPC policy statements. Otherwise, the peering connection cannot be established.

&nbsp;

#### Summary

This add-on enhances the OCI [One-OE Landing Zone](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack) with generated RPC JSON fragments for single-tenancy multi-region peering and cross-tenancy peering.

&nbsp;

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
