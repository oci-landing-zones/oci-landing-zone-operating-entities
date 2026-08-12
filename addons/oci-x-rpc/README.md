# OCI Remote Peering Connection Add-on

The OCI Remote Peering Connection (X-RPC) add-on connects One-OE Landing Zones across OCI regions in the same tenancy or in different tenancies.

It supports two complementary usage paths:

| Path | Purpose |
|---|---|
| [Runtime golden templates](./runtime/README.md) | Current, generated One-OE reference configurations that can be reviewed and adapted for a manual deployment. |
| [Blueprint Factory and LZ Agent](./runtime/x-rpc-blueprint-factory.md) | Config-driven generation for customer-specific regions, environments, platforms, CIDRs, hub models, and RPC peers. |

The runtime examples use a production-oriented reference topology:

- Tenancy 1 is the RPC acceptor in `eu-frankfurt-1`, uses Hub A, and uses `10.0.x.x` CIDRs.
- Tenancy 2 is the RPC requester in `eu-amsterdam-1`, uses Hub B, and uses `10.1.x.x` CIDRs.
- Both examples contain `prod` and `preprod` project networks.
- The same-tenancy examples use the same regional network profiles but omit cross-tenancy IAM.

![Cross-tenancy RPC topology](./images/x-tenancy.png)

## Design Boundary

One-OE owns the complete Landing Zone baseline: governance, compartments, identity domains, groups, baseline policies, hub and spoke VCNs, the base DRG, security, and observability.

X-RPC extends that baseline with:

- RPC objects and DRG attachments
- RPC-specific route tables, route distributions, import statements, and route rules
- VCN and NSG routing for reviewed remote CIDRs
- Minimal cross-tenancy IAM policies when the peer is in another tenancy

Same-tenancy RPC adds network configuration only. Cross-tenancy RPC adds the required acceptor and requester IAM policy statements. X-RPC itself does not add governance resources; the cross-tenancy governance files in `runtime/` are the unchanged One-OE baseline included in the governance/IAM/network golden reference set. Security and observability remain part of the standard One-OE deployment and are not duplicated by this add-on.

The repository source of truth is the current generator under [`gen/`](../../gen/). Runtime JSON files are generated snapshots and must not be used as the implementation source.

## Roles And IAM

| Side | RPC reference | Cross-tenancy IAM identity |
|---|---|---|
| Acceptor | Creates the RPC and omits `peer_id` | Uses the foreign requester group OCID to admit `remote-peering-to` |
| Requester | Uses the acceptor RPC OCID or an orchestrator dependency key | Uses local `'id_lz_common'/'grp-lz-network-admin'` for Allow and Endorse statements |

The requester group OCID is required only on the acceptor side because the group is foreign there. The requester must reference its own identity-domain group by name, not by OCID.

## Routing

The generator discovers all local network-producing environments and platforms dynamically. It adds RPC routing for the reviewed remote CIDRs without replacing the existing One-OE DRG design.

Hub A, Hub B, and Hub C use the common firewall-hub RPC routing path. Hub E uses a direct DRG import-distribution path and is reserved for PoC, lab, or explicitly accepted no-firewall scenarios. The runtime golden templates use Hub A and Hub B.

The add-on does not change customer-specific OCI Network Firewall security policy. The deployed policy must permit the approved cross-region traffic.

![Reference DRG routing](./images/drg-routing.png)

> [!NOTE]
> The diagram is a working reference for establishing cross-tenancy RPC and designing DRG routing for a specific architecture. Tenancy 1 and Tenancy 2 may use different supported hub and firewall patterns depending on the approved customer design.

## Next Steps

- Review the [runtime golden templates](./runtime/README.md) for the manual reference path.
- Follow the [Blueprint Factory and LZ Agent guide](./runtime/x-rpc-blueprint-factory.md) for dynamic generation.
- Follow the [execution guide](./execution.md) for deployment order and validation.

## References

- [OCI Remote Peering through an upgraded DRG](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/scenario_e.htm)
- [OCI IAM policies for routing between VCNs](https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/drg-iam.htm)
- [OCI Landing Zones](https://www.oracle.com/cloud/architecture-and-regions/landing-zones/)

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.
