# **[OCI LZ BCDR](#)**
## **An OCI Open LZ [Addon](#) for Business Continuity and Disaster Recovery landing zone blueprints**


## 1. Overview

The **OCI LZ BCDR** addon provides the core landing zone resources required to support **Business Continuity** and **Disaster Recovery** scenarios for OCI Landing Zone blueprints. It complements a landing zone with the network, security and observability components required to support recovery scenarios across regions. 

### Landing Zone DR design considerations

- The Landing Zone design is built around key pillars, including **identity**, **security**, **networking**, **observability**, and **operations**. From a Business Continuity and Disaster Recovery (BC/DR) perspective, the architecture should minimize single points of failure across these pillars and ensure that critical capabilities remain available or can be recovered in the event of a failure or disaster.
- In **multi-region** landing zones, **identity and security** operates on two levels: Global IAM resources such as compartments, groups, users, and policies are managed from the home region and should be reused consistently across subscribed regions, while regional resources—including security resources (vaults, keys, secrets) and workload-specific security controls—must be explicitly provisioned and deployed or replicated in each target region as part of the workload recovery plan.
- **Networking** requirements vary depending on the DR scenario. Inter-AD designs use regional subnets and resources, while cross-region designs require inter-region peering. Resources are provisioned in their respective regions.
- **Observability** resources, including events, alarms, and logs, are managed on a per-region basis.
- For **operations**, the platform must be resilient enough to support provisioning and day-to-day operation of the solution, including CI/CD, monitoring, and third-party integrations. Multi-region deployment state should be managed separately per region, for example with distinct OCI Resource Manager stacks or Terraform workspaces, so each regional deployment can be planned, applied, and operated independently.

In summary: IAM and governance are reused from the home region, Cloud Guard is tenancy-wide, and network and observability are deployed per region. Vault replication is outside the landing zone scope.

  
<img src="images/layers.png" width="900" alt="BCDR architecture showing IAM and governance managed from the home region, tenancy-wide Cloud Guard, and regional security, network, and observability resources in the home and DR regions. Vault replication is not covered by the landing zone.">

<p align="center"><em>Figure 1</em></p>

<p align="right"><strong>Figure 1: BCDR resource scope</strong></p>

<img src="images/ops_view.png" width="900" alt="Multi-stack deployment.One-oe in Home region and DR extension in DR region">

<p align="center"><em>Figure 2</em></p>

<p align="left"><strong>Figure 2: Multi-stack deployment</strong></p>

For operational resilience, the landing zone deployment is managed as separate stacks: the One-OE in the home region and the DR extension in the target region. This separation allows each regional deployment to be planned, applied, and operated independently, enabling flexible management and targeted updates without affecting the other region.

<img src="images/optionsDR.png" width="900" alt="Four DR deployment variants: a shared or dedicated DR compartment, each deployed across separate Availability Domains or a dedicated secondary region.">

<p align="center"><em>Figure 3</em></p>

<p align="right"><strong>Figure 3: DR deployment options across Availability Domains or regions</strong></p>

The DR workload can reuse the production compartment or run in a dedicated DR compartment; each option can use a separate Availability Domain or a dedicated region. The selected model has different resource provisioning and maintenance requirements. A dedicated DR compartment is useful when a separate team manages DR resources.

To review best practices about BCDR, go [here](BCDR-best-practices.md).

## 2. Deployment Guide

> [!NOTE]
>This add-on covers the DR Landing Zone scope, including core infrastructure resources such as VCNs, route tables, security resources, events, notifications, and other foundational Landing Zone components. It does not deploy workload-specific resources, such as databases, OKE clusters, Exadata Cloud Service (ExaCS), Compute instances, or other application-specific resources.
> The appropriate [DR strategy](./BCDR-best-practices.md#5-dr-strategies) for each workload should be selected and implemented separately, based on its specific availability, RTO, and RPO requirements.

1. Confirm the DR scenario, workloads, regions, tenancy boundaries, connectivity model, and recovery objectives.
2. Deploy or confirm the [One-OE blueprint](../../blueprints/one-oe/runtime/one-stack/readme.md) in the home region.
3. You MAY use the same hub model and CIS level as the home-region deployment; this is the published deployment scenario covered by this add-on. A DR design may instead use a simpler, lower-cost hub model where appropriate, but it requires reviewed, compatible JSON configuration files for that design. If your scenario is not listed, use the [OCI LZ Blueprint Factory](../oci-lz-blueprint-factory/README.md) to create your custom JSON configuration files.

   | Deployment | Use when | Deployment guide |
   |---|---|---|
   | One-OE | The DR environment requires the One-OE landing zone without any workload extension. | [One-OE BCDR](one-oe/README.md) |

4. Run Terraform plan and apply for the DR LZ extension.
5. Configure inter-region connectivity with the [OCI Remote Peering Connections addon](../oci-x-rpc/README.md), using its same-tenancy or cross-tenancy procedure for the selected DR scenario.
6. Validate connectivity, failover behavior, workload replication health, access to keys and secrets in the DR region, monitoring, and operational runbooks.

&nbsp;

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
