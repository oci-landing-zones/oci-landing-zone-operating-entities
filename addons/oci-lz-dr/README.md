# **[OCI LZ BCDR](#)**
## **An OCI Open LZ [Addon](#) for Business Continuity and Disaster Recovery landing zone patterns**

&nbsp;

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Business Continuity and Disaster Recovery concepts](#2-business-continuity-and-disaster-recovery-concepts)<br>
[3. Landing Zone DR design considerations](#3-landing-zone-dr-design-considerations)<br>
[4. Resource scope: global and regional](#4-resource-scope-global-and-regional)<br>
[5. DR strategy trade-offs](#5-dr-strategy-trade-offs)<br>
[6. Deployment Guide](#6-deployment-guide)<br>
[7. Related documentation](#7-related-documentation)<br>
[8. License](#8-license)<br>

&nbsp;

### 1. Overview

The **OCI LZ BCDR** addon provides deployable Business Continuity and Disaster Recovery patterns for OCI Landing Zones. It is intended to complement a landing zone with the network, identity, observability, and operational components required to support recovery scenarios across regions or tenancies.

This addon is a starting point for DR-specific deployment assets and guidance. The exact runtime configuration depends on the selected recovery pattern, such as multi-region connectivity, cross-tenancy connectivity, replicated workload services, DNS failover, backup and restore, or standby environments.

&nbsp;

### 2. Business Continuity and Disaster Recovery concepts

**Business Continuity (BC)** defines how the organization keeps operating during a disruption. It covers people, processes, communication, operational procedures, and the technology capabilities needed to continue delivering critical services.

**Disaster Recovery (DR)** is the technical recovery part of business continuity. It defines how critical systems, data, applications, and infrastructure are restored or failed over after an outage, in the right priority order and within agreed recovery objectives.

**Business Continuity and Disaster Recovery (BCDR)** combines both perspectives. A BCDR design must define how the business continues operating during the incident and how the technology platform recovers service with acceptable downtime and data loss.

In landing zone terms, BC focuses on the operating model around the platform, while DR focuses on the deployable recovery architecture: regions, networks, IAM, observability, automation, data protection, and failover procedures.

Reference: [What is the Difference Between Business Continuity and Disaster Recovery?](https://www.oracle.com/business-continuity/business-continuity-disaster-recovery/)

&nbsp;

### 3. Landing Zone DR design considerations

- The landing zone design is built around four pillars: **security**, **networking**, **observability**, and **operations**.
- For Business Continuity and Disaster Recovery, it is essential to avoid any **single point of failure** across all pillars.
- Depending on the DR model, either **inter-AD** or **cross-region**, resource provisioning and maintenance will have different requirements.
- **Security (IAM)** is always provisioned in the home region and automatically replicated across subscribed regions.
- **Networking** requirements vary depending on the DR scenario: inter-AD designs use regional subnets and resources, while cross-region designs require inter-region peering. Resources are provisioned in their respective regions.
- **Observability** resources, including events, alarms, and logs, are managed on a per-region basis.
- For **operations**, the platform must be resilient enough to support provisioning and day-to-day operation of the solution, including CI/CD, monitoring, and third-party integrations.
- In **multi-region** landing zones, global IAM resources such as compartments, groups, and policies should be reused consistently, while regional resources such as VCNs, vaults, events, topics, and subscriptions must be explicitly provisioned in each target region.
- Multi-region deployment state should be managed separately per region, for example with distinct OCI Resource Manager stacks or Terraform workspaces, so each regional deployment can be planned, applied, and operated independently.

&nbsp;

### 4. Resource scope: global and regional

BCDR planning must distinguish global resources from regional resources. Global resources are created once and reused across subscribed regions, while regional resources must be deployed, monitored, and maintained in each region that participates in the DR design.

The **home region** is especially important because IAM and tenancy-wide governance are managed from there. User accounts, groups, dynamic groups, policies, and compartments are administered in the home region and replicated across subscribed regions for consistent access control. Policy changes, region subscription management, and the initial setup of tenancy-wide governance services must be handled from the home region before regional BCDR resources are deployed.

| **Resource area** | **Scope** | **BCDR implication** |
|-------------------|-----------|----------------------|
| **Tenancy and region subscriptions** | Home-region managed tenancy setting | Target DR regions must be subscribed from the home region before regional resources can be provisioned. |
| **Compartments** | Global, home-region managed | Created and modified from the home region and reused by regional deployments. |
| **Identity domains, users, groups, dynamic groups, and policies** | Global, home-region managed | Managed from the home region, replicated globally for access control, and applied across subscribed regions. |
| **Tag namespaces and tag definitions** | Global | Defined once and reused consistently for DR resources across regions. |
| **Cloud Guard, Security Zones, and governance rules** | Tenancy-wide governance, home-region initialized | Initial setup and baseline governance should be handled with the home-region deployment and reused by regional BCDR deployments. |
| **Budgets, quotas, cost analysis, and cost-governance controls** | Home-region anchored or tenancy-wide, depending on the service | Must be reviewed from the home-region governance model so DR regions have enough capacity, cost guardrails, and reporting coverage. |
| **Centralized operational services** | Service-dependent | Some services used for centralized operations or analytics may require home-region setup or central configuration before regional resources can send data to them. |
| **VCNs, subnets, route tables, gateways, DRGs, attachments, and peering resources** | Regional | Must be provisioned per region according to the selected hub model and DR topology. |
| **Load balancers, network firewalls, network security groups, and security lists** | Regional | Must match the selected regional hub model and workload exposure pattern. |
| **Private DNS zones, views, resolvers, resolver endpoints, and forwarding rules** | Regional | Must be designed per region and aligned with failover, cross-region name resolution, and on-premises DNS requirements. |
| **Object Storage buckets** | Regional | Buckets are regional resources; replication, backup, and recovery behavior must be configured according to the data protection strategy. |
| **Compute, block volumes, file systems, and database service resources** | Regional | Workload recovery resources must be placed in the target region and aligned with the selected RTO/RPO strategy. |
| **Vaults, keys, topics, subscriptions, events, alarms, log groups, flow logs, and service connectors** | Regional | Must be deployed per region when required by the DR operating and monitoring model. |
| **Limits, quotas, and capacity reservations** | Regional or tenancy-scoped, depending on the service | Must be reviewed before failover so the DR region has enough capacity for recovery operations. |
| **Terraform state or OCI Resource Manager stacks** | Regional deployment unit | Keep separate state or stacks per region so each DR region can be planned, applied, and recovered independently. |

&nbsp;

### 5. DR strategy trade-offs

DR design must balance recovery time, acceptable data loss, cost, and operational complexity. Oracle describes two key metrics for this decision:

- **Recovery Time Objective (RTO)**: how long the business can wait until service is restored.
- **Recovery Point Objective (RPO)**: the maximum amount of data the business can accept losing during a disruption.

Common DR approaches include:

| **DR approach** | **Typical fit** | **Trade-off** |
|-----------------|-----------------|---------------|
| **Backup and restore** | Lower-cost recovery for less critical systems or ransomware recovery scenarios. | Longer RTO and RPO. |
| **Pilot light** | Minimal always-on footprint that can be scaled during recovery. | Lower cost than standby, but requires startup and validation during failover. |
| **Warm standby** | Reduced-capacity environment with current data and faster recovery. | Higher cost, lower RTO/RPO. |
| **Active/active** | Critical systems that need near-continuous service. | Highest cost and operational complexity. |

Reference: [Oracle Business Continuity and Disaster Recovery](https://www.oracle.com/business-continuity/business-continuity-disaster-recovery/).

&nbsp;

### 6. Deployment Guide

Deployment assets will be added under this addon when the target DR pattern is selected and reviewed. Recommended deployment flow:

1. Deploy or identify the base OCI Landing Zone.
1. Confirm the DR scenario, regions, tenancy boundaries, connectivity model, and recovery objectives.
1. Review the generated or supplied DR configuration files.
1. Run Terraform plan and apply for the DR addon configuration.
1. Validate connectivity, failover behavior, monitoring, and operational runbooks.

&nbsp;

### 7. Related documentation

| **Resource** | **Purpose** |
|--------------|-------------|
| [Oracle Business Continuity and Disaster Recovery](https://www.oracle.com/business-continuity/business-continuity-disaster-recovery/) | Oracle overview of BCDR concepts, RTO/RPO, DR strategy trade-offs, and cloud-based resilience patterns. |
| [Creating a Secure Multi-Region Landing Zone](https://www.ateam-oracle.com/creating-a-secure-multi-region-landing-zone) | Oracle A-Team reference for secure multi-region landing zone concepts, including global IAM reuse, regional resource provisioning, and separate regional deployment state. |

&nbsp;

### 8. License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
