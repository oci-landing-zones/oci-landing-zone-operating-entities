# **[OCI LZ BCDR](#)**
## **An OCI Open LZ [Addon](#) for Business Continuity and Disaster Recovery landing zone blueprints**

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Deployment Guide](#2-deployment-guide)<br>
[3. License](#3-license)<br>


### 1. Overview

The **OCI LZ BCDR** addon provides the required core resources to allow Business Continuity and Disaster Recovery solutions for OCI Landing Zones blueprints. It is intended to complement a landing zone with the network, identity, observability, and operational components required to support recovery scenarios across ADs, regions or tenancies.

#### Landing Zone DR design considerations

- The landing zone design is built around four pillars: **security**, **networking**, **observability**, and **operations**.
- For Business Continuity and Disaster Recovery, it is essential to avoid any **single point of failure** across all pillars.
- Depending on the DR model, either **inter-AD** or **cross-region**, resource provisioning and maintenance will have different requirements.

<img src="images/optionsDR.png" width="900">

- **Security (IAM)** is always provisioned in the home region and automatically replicated across subscribed regions.
- **Networking** requirements vary depending on the DR scenario: inter-AD designs use regional subnets and resources, while cross-region designs require inter-region peering. Resources are provisioned in their respective regions.
- **Observability** resources, including events, alarms, and logs, are managed on a per-region basis.
- For **operations**, the platform must be resilient enough to support provisioning and day-to-day operation of the solution, including CI/CD, monitoring, and third-party integrations.
- In **multi-region** landing zones, global IAM resources such as compartments, groups, and policies should be reused consistently, while regional resources such as VCNs, vaults, events, topics, and subscriptions must be explicitly provisioned in each target region.
- Multi-region deployment state should be managed separately per region, for example with distinct OCI Resource Manager stacks or Terraform workspaces, so each regional deployment can be planned, applied, and operated independently.

To review best practices about BCDR, go [here](BCDR-best-practices.md).

### 2. Deployment Guide

> [!NOTE]
> This add-on covers the DR Landing Zone scope and the listed Workload Extension scenarios. It does not deploy the workloads themselves; select and implement a dedicated [DR strategy]([BCDR-best-practices.md#5-dr-strategy-trade-offs](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/dr/addons/oci-lz-dr/BCDR-best-practices.md#6-dr-strategies)) in a separate phase.

#### Workload replication considerations

The landing zone extension prepares the DR foundation. Configure and validate workload replication separately, based on the OCI service used and the selected recovery objectives.

| Service layer | Native replication examples | Post-deployment consideration |
|---|---|---|
| Compute | Boot volume replication | Define the instance recovery procedure and test it in the DR region. |
| Containers | OKE with Full Stack Disaster Recovery (FSDR) | For stateful workloads, configure replication through the underlying storage service. |
| Data | Oracle Data Guard, Autonomous Data Guard, database replicas, or backups | Select the mechanism that meets the workload's RTO and RPO. |
| Storage | Object Storage, Block Volume, and File Storage replication | Validate replication scope, retention, and recovery testing. |
| Security | Vault, key, and secret replication | Ensure the DR workload can access the replicated cryptographic material and secrets. |

See [Native Cross-Region Replication Capabilities by OCI Service Layer](https://confluence.oraclecorp.com/confluence/display/EMEACSS/Native+Cross-Region+Replication+Capabilities+by+OCI+Service+Layer) for service-specific capabilities.

1. Deploy the [One-OE baseline](../../blueprints/one-oe/runtime/one-stack/readme.md).
2. Confirm the DR scenario, workloads and regions.
3. This add-on includes the default scenarios listed below. If your scenario is not listed, use the [OCI LZ Blueprint Factory](../oci-lz-blueprint-factory/README.md) to create custom JSON configuration files:

   | Deployment | Use when | Deployment guide |
   |---|---|---|
   | One-OE | The DR environment requires the One-OE landing zone baseline without any Workload extension. | [One-OE BCDR](one-oe/README.md) |

4. Run Terraform plan and apply for the DR LZ extension.
5. Configure inter-region connectivity with the [OCI Remote Peering Connections addon](../oci-x-rpc/README.md).
6. Validate connectivity, failover behavior, monitoring, and operational runbooks.

&nbsp;

### 3. License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
