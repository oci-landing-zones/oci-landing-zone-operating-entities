# **[OCI Database Observability](#)**
## **An OCI Open LZ Addon for Database Observability at Scale**

&nbsp; 

### 1. Overview

Welcome to the **OCI Landing Zone Database Observability add-on**. 

This guide provides the configuration steps required to enable OCI Observability native services, including **Database Management**, **Operations Insights**, and **Logging Analytics**, as add-on capabilities to the Operating Entities blueprints. The One-OE model is used as the default reference architecture throughout this guide.

* **Database Management service** (DBM) offers a comprehensive set of database performance monitoring and management features. Diagnostics & Management enables you to monitor and manage Oracle databases, HeatWave and External MySQL DB systems, and infrastructure components such as DB system components and Exadata storage servers in multi-cloud and hybrid deployments.

* **Ops Insights** (OPSI) provides comprehensive information about the resource use and capacity of databases and hosts. Use this service to analyze CPU and storage resources, forecast capacity issues, and proactively identify SQL performance issues across a database fleet.

* **Logging Analytics** is a machine learning-based cloud service that monitors, aggregates, indexes, and analyzes all log data from on-premises and multicloud environments. Enabling users to search, explore, and correlate this data to troubleshoot and resolve problems faster and derive insights to make better operational decisions.
&nbsp; 

### 2. Benefits of this asset

Following the guidelines explained here reduces the overall management complexity and will help you with:

* Reduce time and effort needed to enable native monitoring services.
* Extend your LZ with dedicated Observability compartments.
* Add the proper Observability groups.
* Add the required policies per each service.
* Add a dedicated vault to securely store secrets for the monitoring group.
&nbsp; 
 
## 3. Design Decisions

To configure this add-on, select the operating model that best matches the customer's organizational structure and the way observability responsibilities are assigned.

<img src="./images/ROLES.png" height="300" align="center">

| Approach | Description | Design impact |
|---|---|---|
| **Centralized** | A central observability team is responsible for all monitored resources across the tenancy. Private endpoints are deployed in a global compartment, and all monitored entities are visible to the observability team. | Centralizes ownership, IAM policies, vault access, and private endpoint management. This approach is suitable when one team operates observability services for the entire tenant. |
| **Project** | Each project team owns a dedicated compartment where it has full control. The observability team is part of the project and has access to the resources that belong to that project. | Distributes observability ownership by project. IAM policies, private endpoints, and access to monitored entities are scoped to the project compartment. |
| **Platform** | Different teams are responsible for specific deployment stages, such as test, pre-production, and production. In this model, each observability team has access to the monitored entities assigned to its deployment scope, even when those entities are allocated across different compartments. | Aligns observability access with platform deployment responsibilities. Policies and access boundaries must reflect the deployment model and may span multiple compartments. |

Across the different database service scenarios presented in this asset, these approaches are intended as reference models. 

The slected approach impacts on OCI Group and Policies, OCI Private End Point deployment needed for Database Management and OpsInsights and OCI Management Agent needed for OCI Log Analytics. 

## 3.1 OCI Group and Policies

Independently from the selected approach, we recommend the creation of the following OCI groups. This allows quicker onboarding of the Observability services across all three approaches.

| Group Name | Group description | Deployment |
|---|---|---|
| **Observability Admin** | Full observability administrator for the compartment. This role can configure and maintain Log Analytics resources, Ops Insights, Database Management, dashboards, notification topics and subscriptions, Management Agents, agent install keys, named credentials, metrics, alarms, private endpoint networking dependencies, compute inventory required for agent visibility, and database credential secrets. It can use OCI database resources needed by the observability services, but it does not grant full database lifecycle administration. | [Policy for Centralized Approach](#policy-for-centralized-approach)<br><br>[Policy for Project Approach](#policy-for-project-approach)<br><br>[Policy for Platform Approach](#policy-for-platform-approach) |
| **Observability User** | Operational user for day-to-day observability work. This role can use Log Analytics, work with dashboards, view Ops Insights and Database Management data, inspect database resources, read metrics and alarms, and use notification topics and subscriptions for observability workflows. It is intended for operators who investigate performance and availability issues without managing service onboarding, private endpoints, agents, or secrets. | [Policy for Centralized Approach](#policy-for-centralized-approach)<br><br>[Policy for Project Approach](#policy-for-project-approach)<br><br>[Policy for Platform Approach](#policy-for-platform-approach) |
| **Observability Reader** | Read-only observability role. This role can view Log Analytics resources, dashboards, Ops Insights, Database Management information, Management Agents, metrics, alarms, notification topics and subscriptions, and database inventory metadata in the compartment. It should not create, update, delete, upload, ingest, or administer observability resources. | [Policy for Centralized Approach](#policy-for-centralized-approach)<br><br>[Policy for Project Approach](#policy-for-project-approach)<br><br>[Policy for Platform Approach](#policy-for-platform-approach) |




## 3.2 Private Endpoints  

For enhanced security, Observability Services should be configured with private access. An OCI Private Endpoint (PE) is a private network access point, exposed through a private IP address in a selected subnet, that allows OCI services such as Database Management and Operations Insights to communicate with monitored databases without using the public internet.

Private End Point are not applicable to ExaCC Scenario that requires OCI Management Agent depoyed on each VMcluster server.

For Database Management and Operations Insights, this add-on uses Private Endpoints to reach the monitored database endpoints. A Private Endpoint is a network resource and does not involve workload, compute, or database capacity consumption. However, Private Endpoints are subject to OCI service limits per region, and the number required depends on the selected approach and database scenario.

| Approach | Network and other considerations | Architecture and Deployment |
|---|---|---|
| **Centralized** | Deploy shared DBM/OPSI Private Endpoints in the global Observability compartment, preferably in the hub VCN Monitoring Subnet. This model reduces the number of endpoints and centralizes routing, NSGs, vault access, and operational ownership for all monitored entities in the tenancy. Connectivity must be enabled from the hub monitoring subnet to the database endpoints in the project or workload compartments. | <img src="./images/centralized-private-endpoints.png" height="180" align="center"><br>[Deployment](./deployment/centralized-private-endpoints.md) |
| **Project** | Deploy project-dedicated Private Endpoints in the project compartment, usually in the project monitoring subnet or in the database subnet used by the monitored database. The project team keeps full control of its compartment, while the observability team participates in the project and receives access to the project resources. Policies, NSGs, routes, and vault access are scoped to the project. | <img src="./images/project-private-endpoints.png" height="180" align="center"><br>[Deployment](./deployment/project-private-endpoints.md) |
| **Platform** | Deploy Private Endpoints according to the platform deployment boundaries, such as test, pre-production, and production. Each platform observability team must be able to reach the monitored entities assigned to its deployment scope, even when those entities are distributed across different compartments. This model requires clear naming, tagging, routing, NSG rules, and policies that reflect the deployment responsibility model. | <img src="./images/platform-private-endpoints.png" height="180" align="center"><br>[Deployment](./deployment/platform-private-endpoints.md) |

&nbsp; 


## 3.3 Management Agent

The OCI Management Agent is required when observability services need an agent to collect logs or interact with monitored database targets from the customer network. In the ExaCS, Base Database, and Autonomous Database scenarios, the Management Agent is needed to enable Log Analytics. In the ExaCC scenario, the Management Agent is needed to enable Database Management, Ops Insights, and Log Analytics.

The detailed instruction steps are provided in the next section.

| Approach | Network and other considerations | Architecture and Deployment |
|---|---|---|
| **Centralized** | Deploy the Management Agent in the global Observability compartment when a shared agent host is required. This model centralizes agent operations and is suitable when the observability team manages targets across the tenancy. The agent host must have network reachability to the monitored database endpoints or log sources, and it must be able to communicate with the required OCI service endpoints for ingestion and management operations. | <img src="./images/centralized-private-endpoints.png" height="180" align="center"><br>[Deployment](./deployment/centralized-management-agent.md) |
| **Project** | Deploy the Management Agent within the project compartment or directly on the database hosts when the scenario requires host-level collection. This keeps agent ownership, policies, routing, and access aligned with the project team while allowing the observability team to participate in the project. The project VCN must provide the required connectivity to OCI services, such as through a Service Gateway where applicable. | <img src="./images/project-private-endpoints.png" height="180" align="center"><br>[Deployment](./deployment/project-management-agent.md) |
| **Platform** | Deploy the Management Agent according to platform deployment boundaries such as test, pre-production, and production. Each platform observability team must have access to the agents and monitored entities assigned to its deployment scope, even when they are distributed across different compartments. This model requires consistent naming, tagging, policies, routing, and lifecycle ownership across deployments. | <img src="./images/platform-private-endpoints.png" height="180" align="center"><br>[Deployment](./deployment/platform-management-agent.md) |




## 4. Scenarios.

| # |  Scenario  | Description | Status |
|:--:|:--:|---|---|
| 1 | <img src="./images/icon_auto.png" height="40" align="center">| Autonomous database| [Available](./scenario-autonomous-databases/readme.md) |
| 2 | <img src="./images/dbcs.png" height="40" align="center">| DBCS | [Available](./scenario-dbcs-databases/readme.md) |
| 3 | <img src="../../commons/images/exacs.png" height="40" align="center"> | ExaDB-D | [Available](./scenario-exacs-databases/readme.md) |
| 4 |  | ODA@ | [Available](./scenario-oda@-databases/readme.md) |
| 5 |<img src="../../commons/images/exacc.png" height="40" align="center" > | EXACC| [Available](./scenario-exacc-databases/readme.md) |
| 6 |  | External Databases | In progress |



# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
