# OCI LZ BCDR Best Practices
## Guidance for planning and operating Business Continuity and Disaster Recovery

**Table of Contents**

[1. Overview](#1-overview)<br>
[2. Business Continuity and Disaster Recovery concepts](#2-business-continuity-and-disaster-recovery-concepts)<br>
[3. Resource scope: global and regional](#3-resource-scope-global-and-regional)<br>
[4. Recovery Objectives](#4-recovery-objectives)<br>
[5. DR Strategies](#5-dr-strategies)<br>
[6. Workload replication considerations](#6-workload-replication-considerations)<br>
[7. Responsibilities](#7-responsibilities)<br>
[8. Post-deployment validation](#8-post-deployment-validation)<br>
[9. Related documentation](#9-related-documentation)<br>
[10. License](#10-license)<br>

### 1. Overview

This guide helps teams plan and operate Business Continuity and Disaster Recovery for OCI Landing Zones. It explains recovery objectives, global versus regional resource scope, DR strategies, and workload replication considerations.

It complements the OCI LZ BCDR addon documentation. The addon deploys the landing zone DR foundation; workload replication, failover procedures, and service-specific recovery configuration must be implemented separately according to the selected DR strategy.

> **Published scenario scope:** the current One-OE BCDR files cover `eu-frankfurt-1` as the home region and `eu-amsterdam-1` as the DR region. They use `10.0.192.0/21` for the DR hub VCN and `10.0.200.0/21` for the DR production VCN. A different region pair, CIDR allocation, or DR topology requires a separately reviewed configuration; do not treat these published values as generic defaults.

&nbsp;

### 2. Business Continuity and Disaster Recovery concepts

**Business Continuity (BC)** defines how the organization keeps operating during a disruption. It covers people, processes, communication, operational procedures, and the technology capabilities needed to continue delivering critical services.

**Disaster Recovery (DR)** is the technical recovery part of business continuity. It defines how critical systems, data, applications, and infrastructure are restored or failed over after an outage, in the right priority order and within agreed recovery objectives.

**Business Continuity and Disaster Recovery (BCDR)** combines both perspectives. A BCDR design must define how the business continues operating during the incident and how the technology platform recovers service with acceptable downtime and data loss.

In landing zone terms, BC focuses on the operating model around the platform, while DR focuses on the deployable recovery architecture: regions, networks, IAM, observability, automation, data protection, and failover procedures.

Reference: [What is the Difference Between Business Continuity and Disaster Recovery?](https://www.oracle.com/business-continuity/business-continuity-disaster-recovery/)

&nbsp;

### 3. Resource scope: global and regional

BCDR planning must distinguish global resources from regional resources. Resource scope depends on the OCI service: some resources are managed centrally from the home region and made available across subscribed regions, while regional resources must be provisioned, monitored, and maintained independently in each participating region.

The **home region** is especially important because IAM and tenancy-wide governance are managed from there. User accounts, groups, dynamic groups, policies, and compartments are managed centrally from the home region and made available across subscribed regions for consistent access control. Policy changes, region subscription management, and the initial setup of tenancy-wide governance services must be handled from the home region before regional BCDR resources are deployed.

| **Resource area** | **Scope** | **Owner** | **BCDR implication** |
|-------------------|-----------|-----------|----------------------|
| **Tenancy and region subscriptions** | Home-region managed tenancy setting | Tenancy administrator | Target DR regions must be subscribed from the home region before regional resources can be provisioned. |
| **Compartments** | Global, home-region managed | One-OE blueprint | Created and modified from the home region and reused by regional deployments. |
| **Identity domains, users, groups, dynamic groups, and policies** | Global, home-region managed | IAM administrator and One-OE blueprint | Managed centrally from the home region and made available across subscribed regions for access control. |
| **Tag namespaces and tag definitions** | Global | Governance administrator | Defined once and reused consistently for DR resources across regions. |
| **Cloud Guard, Security Zones, and governance rules** | Cloud Guard is tenancy-wide; Security Zones are compartment-scoped; home-region initialized | Governance administrator and One-OE blueprint | Initial setup and blueprint governance should be handled with the home-region deployment. Reuse the tenancy-wide controls and maintain the compartment-scoped Security Zone associations consistently for regional BCDR deployments. |
| **Budgets, quotas, cost analysis, and cost-governance controls** | Home-region anchored or tenancy-wide, depending on the service | FinOps and tenancy administrator | Must be reviewed from the home-region governance model so DR regions have enough capacity, cost guardrails, and reporting coverage. |
| **Centralized operational services** | Service-dependent | Platform operations | Some services used for centralized operations or analytics may require home-region setup or central configuration before regional resources can send data to them. |
| **VCNs, subnets, route tables, gateways, and DRGs** | Regional | BCDR addon | Must be provisioned per region according to the selected hub model and DR topology. |
| **Remote Peering Connections, DRG attachments, and inter-region routes** | Regional inter-region connectivity | BCDR addon | Must be deployed after the regional network is available and validated in both directions. Cross-tenancy peering requires the appropriate RPC procedure and tenancy permissions. |
| **Load balancers, network firewalls, network security groups, and security lists** | Regional | BCDR addon | Must match the selected regional hub model; workload owners must define and validate workload exposure requirements. |
| **Private DNS zones, views, resolvers, resolver endpoints, and forwarding rules** | Regional | DNS and network administrator | Must be designed per region and aligned with failover, cross-region name resolution, and on-premises DNS requirements. |
| **Object Storage buckets** | Regional | Storage administrator and workload owner | Buckets are regional resources; replication, backup, and recovery behavior must be configured according to the data protection strategy. |
| **Compute, block volumes, file systems, and database service resources** | Regional | Workload owner | Workload recovery resources must be placed in the target region and aligned with the selected RTO/RPO strategy. |
| **Vaults, keys, topics, subscriptions, events, alarms, log groups, flow logs, and service connectors** | Regional | Security and platform operations | Must be deployed per region when required by the DR operating and monitoring model. |
| **Limits, quotas, and capacity reservations** | Regional or tenancy-scoped, depending on the service | Tenancy administrator and service owner | Must be reviewed before failover so the DR region has enough capacity for recovery operations. |
| **Terraform state or OCI Resource Manager stacks** | Regional deployment unit | Platform operations | Keep separate state or stacks per region so each DR region can be planned, applied, and recovered independently. |

&nbsp;

### 4. Recovery Objectives



DR design must balance recovery time, acceptable data loss, cost, and operational complexity. Oracle describes two key metrics for this decision:

- **Recovery Time Objective (RTO)**: how long the business can wait until service is restored.
- **Recovery Point Objective (RPO)**: the maximum amount of data the business can accept losing during a disruption.

The BCDR addon provides the landing zone foundation but does not define or guarantee RTO or RPO for individual workloads. Workload owners must set these objectives, select a recovery strategy that meets them, measure the results during recovery tests, and approve any remaining gaps.


### 5. DR Strategies

Common DR approaches include:

| **DR approach** | **Typical fit** | **Trade-off** |
|-----------------|-----------------|---------------|
| **Backup and restore** | Lower-cost recovery for less critical systems or ransomware recovery scenarios. | Longer RTO and RPO. |
| **Pilot light** | Minimal always-on footprint that can be scaled during recovery. | Lower cost than standby, but requires startup and validation during failover. |
| **Warm standby** | Reduced-capacity environment with current data and faster recovery. | Higher cost, lower RTO/RPO. |
| **Active/active** | Critical systems that need near-continuous service. | Highest cost and operational complexity. |

Reference: [Oracle Business Continuity and Disaster Recovery](https://www.oracle.com/business-continuity/business-continuity-disaster-recovery/).

&nbsp;

### 6. Workload replication considerations

The landing zone extension prepares the DR foundation. Configure and validate workload replication separately, based on the OCI service used and the selected recovery objectives.

| Service layer | Native replication examples | Post-deployment consideration |
|---|---|---|
| Compute | Boot volume replication | Define the instance recovery procedure and test it in the DR region. |
| Containers | OKE with Full Stack Disaster Recovery (FSDR) orchestration | Configure the recovery workflow and, for stateful workloads, replication through the underlying storage service. |
| Data | Oracle Data Guard, Autonomous Data Guard, database replicas, or backups | Select the mechanism that meets the workload's RTO and RPO. |
| Storage | Object Storage, Block Volume, and File Storage replication | Validate replication scope, retention, and recovery testing. |
| Security | Vault, key, and secret replication | Ensure the DR workload can access the replicated cryptographic material and secrets. |

&nbsp;

### 7. Responsibilities

Successful DR requires coordination across the landing zone, platform operations, and workload teams:

- **One-OE blueprint**: manage IAM, compartments, Cloud Guard, Security Zones, and other tenancy-wide governance resources from the home region.
- **BCDR addon**: deploy and maintain the regional network, VSS, observability, and inter-region connectivity foundation in the DR region.
- **Platform operations**: manage Terraform state or OCI Resource Manager stacks, deployment automation, dependencies, runbooks, and regional operational procedures.
- **Workload owners**: configure data and application replication, recovery dependencies, application failover and failback, and access to required keys and secrets. Workload owners also define and validate RTO and RPO.

### 8. Post-deployment validation

After deploying the landing zone DR foundation and configuring workload recovery, validate the following items and record the results in the DR runbook:

- **Network and RPC**: confirm that the RPCs are connected, DRG attachments are available, and routes work in both directions between the home and DR networks.
- **Security controls**: confirm that regional VSS targets are active and that tenancy-wide Cloud Guard, Security Zones, and IAM controls remain applied as intended.
- **DNS and service access**: validate regional and cross-region name resolution, private endpoints, required service gateways, and any on-premises or multi-cloud DNS forwarding.
- **Observability**: confirm that regional logs, events, alarms, notifications, and flow logs are being collected and delivered to the intended destinations. Separately validate Object Storage replication of operational data when it is part of the DR design.
- **Workload recovery**: verify replication health, recovery dependencies, boot or database recovery procedures, and access to replicated keys and secrets.
- **Capacity and quotas**: confirm that the DR region has sufficient service limits, quotas, IP capacity, and database or compute capacity for the selected recovery strategy.
- **Failover and failback**: execute a planned recovery test, measure the achieved RTO and RPO, validate application functionality, and document the failback procedure.

### 9. Related documentation

| **Resource** | **Purpose** |
|--------------|-------------|
| [Oracle Business Continuity and Disaster Recovery](https://www.oracle.com/business-continuity/business-continuity-disaster-recovery/) | Oracle overview of BCDR concepts, RTO/RPO, DR strategy trade-offs, and cloud-based resilience patterns. |
| [Creating a Secure Multi-Region Landing Zone](https://www.ateam-oracle.com/creating-a-secure-multi-region-landing-zone) | Oracle A-Team reference for secure multi-region landing zone concepts, including global IAM reuse, regional resource provisioning, and separate regional deployment state. |

&nbsp;

### 10. License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
