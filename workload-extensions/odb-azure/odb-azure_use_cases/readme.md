# ExaDB-D Use Cases <!-- omit from toc -->

## **Table of Contents** <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Workload Use Cases**](#2-workload-use-cases)
  - [**2.1 ADB-S@Azure Platform**](#21-adb-sazure-platform)
  - [**2.2 ExaDB-D@Azure Platform**](#22-exadb-dazure-platform)
    - [**ExaDB-D Resources**](#exadb-d-resources)
    - [**ExaDB-D Groups**](#exadb-d-groups)
    - [**ExaDB-D Observability**](#exadb-d-observability)
  - [**2.2 Hybrid ExaDB-D Platform: Shared infrastructure with dedicated VMCs/AVMCs per environment**](#22-hybrid-exadb-d-platform-shared-infrastructure-with-dedicated-vmcsavmcs-per-environment)
    - [**ExaDB-D Resources**](#exadb-d-resources-1)
    - [**ExaDB-D Groups**](#exadb-d-groups-1)
    - [**ExaDB-D Observability**](#exadb-d-observability-1)
  - [**2.3 Dedicated ExaDB-D Platform: Fully dedicated infrastructure and VMCs/AVMCs per environment**](#23-dedicated-exadb-d-platform-fully-dedicated-infrastructure-and-vmcsavmcs-per-environment)
    - [**ExaDB-D Resources**](#exadb-d-resources-2)
    - [**ExaDB-D Groups**](#exadb-d-groups-2)
    - [**ExaDB-D Observability**](#exadb-d-observability-2)
- [**3. Common Use Cases**](#3-common-use-cases)
- [**4. Design Decisions**](#4-design-decisions)
- [**3. Common Use Cases**](#3-common-use-cases-1)
  - [**3.1. Autonomous Recovery Service.**](#31-autonomous-recovery-service)
  - [**3.2. Multi-subscription DB Teams.**](#32-multi-subscription-db-teams)
  - [**3.3. Manage Customer-managed database encryption keys with OCI Vault.**](#33-manage-customer-managed-database-encryption-keys-with-oci-vault)
  - [**3.4. High availability between AZs/ADs.**](#34-high-availability-between-azsads)
  - [**3.5. High availability between regions.**](#35-high-availability-between-regions)
  - [**3.6 Basic OCI Exadata Monitoring (Audit Logs, Events, Alarms).**](#36-basic-oci-exadata-monitoring-audit-logs-events-alarms)
  - [**3.7 Advanced OCI Database Observability (DBM, OPSI, LA).**](#37-advanced-oci-database-observability-dbm-opsi-la)
  - [**3.8 Database Audit Logs (OCI Datasafe).**](#38-database-audit-logs-oci-datasafe)
  - [**3.9 OCI Workloads connecting to OD@ Databases.**](#39-oci-workloads-connecting-to-od-databases)
- [**4. Management of other resources**](#4-management-of-other-resources)
  - [**4.1 Disaster Recovery (DR)**](#41-disaster-recovery-dr)
  - [**4.2 Operator Access Control**](#42-operator-access-control)
  - [**4.3 Software Images**](#43-software-images)
  - [**4.4 Backup Destinations**](#44-backup-destinations)

## **1. Summary**

The OD@Azure is a cloud service that is physically located and runs from Azure datacenters. The service use a combination of Azure and OCI Control Planes to manage the different components of the service. You have the choice to use some services from Azure or OCI, depending on your preferences or best available solution.

In this Workload Extension we'll cover some of the different Oracle Database deployment options that can be deployed as part of the service. We refer to these deployment options as Workload Use Cases (WUCs). You can select the service most suitable for your needs. Objective of the Workload Extension is that you have everything you need to setup a secure environment.

The Workload Extension also explains some scenarios where typically you need to use additional OCI resources based on your requirements. These additional resources can be related to security, networking, monitoring, backup or use OD@Azure with another OCI workloads. These elements need to have an OCI Landing Zone to be able to govern in a secure and scalable way. They are common building blocks between Azure, Google Cloud and AWS, so they're considered addons in the OCI Landing Zone framework.

In this Landing Zone Workload Extension, we provide examples of common scenarios that customers typically encounter, along with guidance on how the available templates can be used to implement solutions tailored to specific requirements.

This section is intended to guide you through several of these scenarios.

We have identified two Workload Use Cases (WUCs):

1) WUC1 | ADB-S@Azure Platform: Dedicated serverless Oracle AI Database.
2) WUC2 | ExaDB-D@Azure Platform: Shared infrastructure with dedicated VM-Clusters.

While not all possible configurations are covered, these represent the most common scenarios. If your use case involves a combination of these, you can leverage elements from each to design a custom solution.

Autonomous AI Databases Serverless (ADB-S) database is Oracle’s fully managed cloud database service that runs on Oracle Exadata infrastructure. The “Serverless” model means Oracle automatically manages the database infrastructure, including provisioning, patching, backups, tuning, scaling, and maintenance, so users can focus on applications and data rather than database administration. It has a low operational cost.

The ExaDB-D infrastructure consists of database and storage servers connected through a RoCE switch fabric. It supports both "regular" *Virtual Machine Clusters (VMCs)* and *Autonomous Virtual Machine Clusters (AVMCs)*. Each VMC/AVMC is composed of one or more virtual machines distributed across database servers, ensuring high availability through Oracle Grid Infrastructure clusterware.

On top of regular VMCs, you can deploy multiple *Oracle Homes (OHs)*, which are used to create and run *Oracle Container Databases (CDBs)*. Each CDB can host multiple *Pluggable Databases (PDBs)*.

In OD@Azure you can't select the compartment where any component is going to be deployed (ADB-S, VMCs, CDBs or PDBs. They'd be organized depending on the subscription ID used in Azure, and in OCI will be present in a compartment with the subscription ID inside the top level MulticloudLink_ODBAA compartment. Default [RBAC](https://docs.oracle.com/en-us/iaas/Content/database-at-azure/onboard-access-control.htm) groups are created during the link process. This workload extension adds the possibility to create MultiSubscription limited groups to create finer separation of duties in your organization, limiting the access only to the database components withing the team subscription.

Although it is possible to fine-tune IAM policies to grant access to specific OHs, CDBs, or PDBs using tags, this approach requires significant effort after deployment and can be difficult to maintain over time.

Similarly, AVMCs can be created on top of an ExaDB-D infrastructure. Within each AVMC, you can create multiple *Autonomous Container Databases (ACDs)*, and within each ACD, multiple *Autonomous Databases Dedicated (ADB-D)*. 

By default, IAM policies created during the OD@ link, grants permissions to all the groups to the different groups over the "MultiCloudLink_ODBAA_<link_date>" enclosing compartment, meaning that, even if you use multiple Azure subscriptions, the same DB administrators will get access to each OCI subscription-level compartment. As many organizations use the Azure subscriptions to isolate and separate different teams workload scope, we facilitate here the same as a Common Use Case (CUC) to manage these sub-compartments with Tag-Based Access Controls, by assigning some tags to the compartments and tag also the new groups, reusing a template policy that only grants to the DB team tagged with the compartment tags the needed permissions that allows to manage its resources, not others.

## **2. Workload Use Cases**

In this section, we describe the identified workload use case scenarios, providing additional guidance on key aspects such as the **separation of duties** across operations teams and the **architectural design decisions** involved in placing resources and ExaDB-D components.

1) WUC1 | ADB-S@Azure Platform: Dedicated serverless Oracle AI Database.
2) WUC2 | ExaDB-D@Azure Platform: Shared infrastructure with dedicated VM-Clusters.

### **2.1 ADB-S@Azure Platform**

<p align="center">
<img src="../content/adb-s_azure_wuc1.jpg" width="1000" height="auto">
</p>

### **2.2 ExaDB-D@Azure Platform**

<p align="center">
<img src="../content/exadb-d_azure_wuc2.jpg" width="1000" height="auto">
</p>


#### **ExaDB-D Resources**

In this scenario, the ExaDB-D stack is treated as a **shared platform** from the infrastructure perspective. There are two infrastructures, <img src="../content/a.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">: one primary and one disaster recovery (DR), both deployed in the shared ExaDB-D infra compartment.

Regular Virtual Machine Clusters (VMCs), along with their associated Oracle Homes (OHs), Container Databases (CDBs), and Pluggable Databases (PDBs) are all deployed within the same ExaDB-D DB compartment <img src="../content/b.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, as these resources cannot be distributed across multiple compartments. This model simplifies management but implies that access control must be handled carefully, as all resources reside in a shared scope.

For Autonomous deployments AVMCs and Autonomous Container Databases (ACDs) are also created within the ExaDB-D DB compartment <img src="../content/c.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">. However, Autonomous Databases Dedicated (ADB-D) can be deployed in separate project compartments <img src="../content/d.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">. This provides greater flexibility, allowing better isolation between environments, more granular IAM policy control, and easier delegation of administrative responsibilities.

The images used to provision the different Oracle Homes, both for Grid Infrastructure and for the databases, are stored in the ExaDB-D DB compartment <img src="../content/e.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">.

#### **ExaDB-D Groups**

The administrative groups <img src="../content/f.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are defined to align with the operational model of this shared platform and enforce a clear separation of responsibilities.

The groups associated with the shared ExaDB-D environment are:

- **Global Infra Admin Team**, responsible for the management and maintenance of the ExaDB-D infrastructure, including VMCs and AVMCs, as well as related infrastructure-level operations.
- **Global DBA Team**, responsible for database administration tasks within the shared compartment, including Oracle Homes (OHs), CDBs, PDBs, and ACDs.

In addition, environment-specific database administration is handled by dedicated groups:

- **Project DBA Team (per environment and project)**, responsible exclusively for managing the ADB-D databases deployed within their respective project compartments.

This approach ensures that infrastructure and shared database layers are centrally managed, while granting each environment its own level of autonomy over its dedicated Autonomous Databases, reinforcing both governance and operational efficiency.

#### **ExaDB-D Observability**

The observability framework for this scenario is based on the combined use of **Events, Alarms, and Notifications**, enabling centralized monitoring and controlled dissemination of operational signals across both shared and environment-specific resources.

**Events**

Event rules <img src="../content/g.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are configured to capture relevant lifecycle and operational events generated by ExaDB-D resources. These rules are defined across both shared and environment-specific compartments and are responsible for routing events to the corresponding notification topics.

At the shared level, event rules cover the shared EXACC infrastructure compartment and the shared EXACC database compartment, routing those events to the corresponding shared infrastructure and database workload notification topics.

At the project level, event rules cover the production and pre-production project database compartments, routing those events to the corresponding environment project notification topics.

These event rules ensure that operational changes, failures, or state transitions are automatically propagated to the appropriate notification channels.

**Alarms**

Alarms <img src="../content/h.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are defined within the shared ExaDB-D Database compartment to monitor key performance and utilization metrics of the database clusters.

The following alarms are configured:

- Database CPU utilization
- Database storage utilization
- VMC CPU utilization
- VMC disk group utilization
- VMC filesystem utilization
- VMC memory utilization
- VMC swap utilization

These alarms continuously evaluate defined thresholds and, upon breach, generate alerts that are forwarded to the corresponding notification topics.

**Notifications**

Notification topics <img src="../content/i.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are configured within the security compartments, both at a global scope and at the environment level, to serve as the primary mechanism for delivering alerts and event messages.

At the global level, notification topics support shared ExaDB-D infrastructure and shared ExaDB-D database workloads.

At the environment level, dedicated notification topics support production and pre-production project scopes.
- **Production**: `nott-lz-prod-exacc`
- **Pre-Production**: `nott-lz-preprod-exacc`

These topics act as targets for both alarm actions and event rules, ensuring consistent and centralized message delivery.

**Operational Flow**

The observability components operate in an integrated manner:

- *Alarms* evaluate metric thresholds and generate alerts.
- *Events* capture resource state changes and operational signals. Event Rules route events to notification topics.
- *Notifications* deliver messages to subscribed endpoints.

This model provides a consistent and scalable observability approach, combining centralized monitoring of shared ExaDB-D resources with environment-specific visibility and control.

### **2.2 Hybrid ExaDB-D Platform: Shared infrastructure with dedicated VMCs/AVMCs per environment**

<p align="center">
<img src="../content/exacc_use_case_2.png" width="1000" height="auto">
</p>

#### **ExaDB-D Resources**

In this scenario, the ExaDB-D stack follows a **hybrid model**, where the infrastructure layer is shared while compute resources (VMCs/AVMCs) are dedicated per environment.

There are two infrastructures, <img src="../content/a.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">: one primary and one disaster recovery (DR), both deployed in the shared ExaDB-D infra compartment.

Regular Virtual Machine Clusters (VMCs), along with their associated Oracle Homes (OHs), Container Databases (CDBs), and Pluggable Databases (PDBs), are deployed in environment-specific compartments <img src="../content/b.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">. This allows each environment to have dedicated database stacks, improving isolation, governance, and operational control compared to the fully shared model.

For Autonomous deployments, AVMCs and Autonomous Container Databases (ACDs) are also created within their respective environment-specific compartments <img src="../content/c.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">.

Autonomous Databases Dedicated (ADB-D) are deployed in project-level compartments <img src="../content/d.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, maintaining a clear separation between projects within the same environment and enabling fine-grained IAM control.

The images used to provision the different Oracle Homes, both for Grid Infrastructure and for the databases, are stored in each environment-specific ExaDB-D DB compartment <img src="../content/e.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, ensuring that software artifacts are fully segregated per environment.

#### **ExaDB-D Groups**

The administrative groups <img src="../content/f.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are defined following a hybrid model, combining global, environment-level, and project-level responsibilities to balance central governance with environment isolation.

At the global level, shared administration groups are defined:

- **Global Infra Admin Team**, responsible for managing infrastructure resources across the entire Landing Zone, including the ExaDB-D infrastructure and shared components.

At the environment level, dedicated groups are defined per environment:

- **Env Infra Admin Team (per environment)**, responsible for the management and maintenance of infrastructure resources within the environment, including VMCs and AVMCs.
- **Environment DBA Team (per environment)**, responsible for database administration within the environment, including Oracle Homes (OHs), CDBs, PDBs, and ACDs.

In addition, project-scoped groups are defined:

- **Project DBA Team (per environment and project)**, responsible exclusively for managing the ADB-D databases deployed within their respective project compartments.

These project-level DBA groups are scoped at the project level within each environment, enabling fine-grained ownership and access control.

This model enforces a layered separation of duties, where infrastructure governance is partially centralized at the global level, environment-specific resources are managed at the environment level, and Autonomous Databases Dedicated (ADB-D) are managed at the project level providing a balanced approach between central control, environment isolation, and project-level autonomy.

#### **ExaDB-D Observability**

The observability framework for this scenario is based on the combined use of **Events, Alarms, and Notifications**, enabling centralized monitoring and controlled dissemination of operational signals across both shared and environment-specific resources.

**Events**

Event rules <img src="../content/g.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are configured to capture relevant lifecycle and operational events generated by ExaDB-D resources. These rules are defined across both shared and environment-specific compartments and are responsible for routing events to the corresponding notification topics.

At the shared level, event rules cover the shared ExaDB-D infrastructure compartment.

At the environment level, event rules cover the production and pre-production ExaDB-D database compartments.

At the project level, event rules cover the production and pre-production project database compartments.

These event rules ensure that operational changes, failures, or state transitions are automatically propagated to the appropriate notification channels.

**Alarms**

Alarms <img src="../content/h.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are defined within each environment-specific ExaDB-D Database compartment to monitor key performance and utilization metrics of the database clusters.

The following alarms are configured:

- Database CPU utilization
- Database storage utilization
- VMC CPU utilization
- VMC disk group utilization
- VMC filesystem utilization
- VMC memory utilization
- VMC swap utilization

These alarms continuously evaluate defined thresholds and, upon breach, generate alerts that are forwarded to the corresponding notification topics.

**Notifications**

Notification topics <img src="../content/i.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are configured within the security compartments, both at a global scope and at the environment level, to serve as the primary mechanism for delivering alerts and event messages.

At the global level, notification topics support shared ExaDB-D infrastructure.

At the environment level, dedicated notification topics support production and pre-production projects and ExaDB-D compartment scopes.
- **Production**: nott-lz-prod-exacc-projects
- **Pre-Production**: nott-lz-preprod-exacc-projects

These topics act as targets for both alarm actions and event rules, ensuring consistent and centralized message delivery.

**Operational Flow**

The observability components operate in an integrated manner:

- *Alarms* evaluate metric thresholds and generate alerts.
- *Events* capture resource state changes and operational signals. Event Rules route events to notification topics.
- *Notifications* deliver messages to subscribed endpoints.

This model provides a consistent and scalable observability approach, combining centralized monitoring of shared ExaDB-D resources with environment-specific visibility and control.


### **2.3 Dedicated ExaDB-D Platform: Fully dedicated infrastructure and VMCs/AVMCs per environment**

<p align="center">
<img src="../content/exacc_use_case_3.png" width="1000" height="auto">
</p>

#### **ExaDB-D Resources**

In this scenario, the ExaDB-D stack follows a **fully dedicated model**, where both the infrastructure and compute layers are isolated per environment.

Each environment is provisioned with its own ExaDB-D infrastructure <img src="../content/a.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, including both primary and disaster recovery (DR) deployments, ensuring complete isolation across environments.

Regular Virtual Machine Clusters (VMCs), along with their associated Oracle Homes (OHs), Container Databases (CDBs), and Pluggable Databases (PDBs), are deployed within environment-specific compartments <img src="../content/b.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">. This ensures that each environment operates its own fully isolated database stack, with no shared resources across environments.

For Autonomous deployments, AVMCs and Autonomous Container Databases (ACDs) are also created within their respective environment-specific compartments <img src="../content/c.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, maintaining full separation between environments.

Autonomous Databases Dedicated (ADB-D) are deployed in project-level compartments <img src="../content/d.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, providing isolation between projects within the same environment and enabling fine-grained IAM control.

The images used to provision the different Oracle Homes, both for Grid Infrastructure and for the databases, are stored in each environment-specific ExaDB-D DB compartment <img src="../content/e.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;">, ensuring that software artifacts are fully segregated per environment.

#### **ExaDB-D Groups**

The administrative groups <img src="../content/f.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are defined following a fully dedicated model, where responsibilities are primarily scoped at the environment level, with additional segregation at the project level for Autonomous databases.

For each environment, dedicated groups are defined:

- **Env Infra Admin Team (per environment)**, responsible for the management and maintenance of the ExaDB-D infrastructure within that environment, including VMCs and AVMCs, as well as all infrastructure-related operations.
- **Environment DBA Team (per environment)**, responsible for database administration within the environment, including Oracle Homes (OHs), CDBs, PDBs, and ACDs.

In addition, project-scoped groups are defined:

- **Project DBA Team (per environment and project)**, responsible exclusively for the ADB-D databases deployed within their respective project compartments.

These project-level DBA groups are not scoped at the environment level, but rather at the project level within each environment, ensuring fine-grained ownership and access control for Autonomous databases.

This model enforces a clear multi-level separation of duties, where infrastructure and core database layers are managed at the environment level and Autonomous Databases Dedicated (ADB-D) are managed at the project level ensuring strong isolation, governance, and operational ownership across both environments and projects.

#### **ExaDB-D Observability**

The observability framework for this scenario is based on the combined use of **Events, Alarms, and Notifications**, enabling centralized monitoring and controlled dissemination of operational signals across both shared and environment-specific resources.

**Events**

Event rules <img src="../content/g.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are configured per environment to capture lifecycle and operational events generated by ExaDB-D resources.

At the environment level, event rules cover the ExaDB-D infrastructure compartments and ExaDB-D database compartments for each generated environment.

At the project level, event rules cover the production and pre-production project database compartments.

This ensures that all events are handled within the scope of their corresponding environment.

**Alarms**

Alarms <img src="../content/h.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are defined within each environment-specific ExaDB-D Database compartment to monitor key performance and utilization metrics of the database clusters.

The following alarms are configured:

- Database CPU utilization
- Database storage utilization
- VMC CPU utilization
- VMC disk group utilization
- VMC filesystem utilization
- VMC memory utilization
- VMC swap utilization

These alarms continuously evaluate defined thresholds and, upon breach, generate alerts that are forwarded to the corresponding notification topics.

**Notifications**

Notification topics <img src="../content/i.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;"> are configured within the security compartments, both at a global scope and at the environment level, to serve as the primary mechanism for delivering alerts and event messages.

At the environment level, dedicated notification topics support production and pre-production projects and ExaDB-D compartment scopes (infra and database).

These topics act as targets for both alarm actions and event rules, ensuring consistent and centralized message delivery.

**Operational Flow**

The observability components operate in an integrated manner:

- *Alarms* evaluate metric thresholds and generate alerts.
- *Events* capture resource state changes and operational signals. Event Rules route events to notification topics.
- *Notifications* deliver messages to subscribed endpoints.

This model provides a consistent and scalable observability approach, combining centralized monitoring of shared ExaDB-D resources with environment-specific visibility and control.

## **3. Common Use Cases**


## **4. Design Decisions**

This section outlines the key design decisions adopted for the ExaDB-D architecture, covering administrative responsibilities, resource placement, visual representation, and networking strategy.

**Administrative Model**

The administrative model is structured across three levels: global, environment, and project, enabling a consistent separation of responsibilities across the platform. The presence and scope of these administrative groups may vary depending on the selected use case.

At the global level, centralized teams are defined:

- **Global Infra Admin Team**, responsible for the management and maintenance of ExaDB-D infrastructure components across the Landing Zone.
- **Global DBA Team**, responsible for governance, standards, and administration of shared database-related components.

At the environment level, dedicated teams are defined per environment:

- **Env Infra Admin Team (per environment)**, responsible for infrastructure operations within the environment, including VMCs and AVMCs.
- **Env DBA Team (per environment)**, responsible for database administration within the environment, including Oracle Homes (OHs), CDBs, PDBs, and ACDs.

At the project level, administration is limited to database ownership:

- **Project DBA Team (per project)**, responsible exclusively for managing ADB-D databases within their respective project compartments.

This model enforces a multi-level separation of duties, aligning operational ownership with the scope of each resource.

**Visual Representation (Diagram Interpretation)**

The architecture diagrams use a color-based convention to represent the scope of resources:

- Dark-colored elements represent globally shared components, managed at the global level.
- Light-colored elements represent environment-specific (dedicated) resources, regardless of the environment (e.g., Production or Pre-Production).

This visual distinction allows quick identification of level of isolation (global vs environment).

**Networking Strategy**

Networking for ExaDB-D is designed to align with infrastructure constraints while enabling reuse and flexibility across environments.

VMC Networks must be created within the ExaDB-D Infrastructure compartment, as they cannot reside in a different compartment from the infrastructure itself. Each VMC requires connectivity to on-premises networks through both client VLANs, used for application traffic, and backup VLANs, used for backup and replication purposes. These VLANs are trunked through the database server network interfaces.

In this design, separate VLANs are typically defined for Primary (PROD) and Disaster Recovery (DR) environments. However, depending on the customer’s network architecture, VLANs may be extended across data centers or availability locations, allowing the same VLANs to be reused across multiple ExaDB-D infrastructures.

Although each VMC requires its own VMC Network resource, this does not imply that network segmentation must be unique per cluster. Multiple VMCs and AVMCs can share the same backend subnets and VLANs when operating within the same network domain. This enables efficient reuse of network configurations across environments and projects while still complying with ExaDB-D networking requirements.

This approach ensures consistency, optimizes network resource utilization, and aligns with enterprise networking standards while respecting platform constraints.

**Resource Placement Strategy**

A key design decision in this architecture is how database resources are placed and managed, taking into account the inherent differences between regular database deployments (VMC-based) and Autonomous Database deployments.

In the case of regular database clusters, the placement model is inherently constrained by the platform. A VMC, together with its associated Oracle Homes (OHs), Container Databases (CDBs), and Pluggable Databases (PDBs), must be deployed within a single compartment, and all dependent resources must remain within that same boundary. Since PDBs cannot be placed outside of their parent CDB and VMC, the cluster effectively defines both the administrative and placement scope. This means that any level of isolation or delegation must be defined at the level where the VMC is deployed (for example, global or environment level), as finer granularity at the database level is not possible.

In contrast, Autonomous Databases Dedicated (ADB-D) provide a fundamentally different model. Although they are hosted within AVMC/ACD structures, they can be deployed in independent compartments, separate from the underlying infrastructure components. This introduces true flexibility at the database level, allowing each database to be aligned with a specific ownership and operational boundary.

Based on this capability, a deliberate design decision has been made to always deploy Autonomous Databases at the project level. This ensures that each ADB is associated with its corresponding project compartment, enabling clear ownership, fine-grained access control, and independent lifecycle management.

By combining these two approaches, the architecture acknowledges the structural constraints of VMC-based deployments—where the cluster defines the boundary—while leveraging the flexibility of Autonomous Databases to achieve project-level isolation and delegation.

## **3. Common Use Cases**

1) CUC1 | Autonomous Recovery Service.
2) CUC2 | Multi-subscription DB Teams.
3) CUC3 | Manage Customer-managed database encryption keys with OCI Vault.
4) CUC4 | High availability between AZs/ADs.
5) CUC5 | High availability between regions.
6) CUC6 | Basic OCI Exadata Monitoring (Audit Logs, Events, Alarms).
7) CUC7 | Advanced OCI Database Observability (DBM, OPSI, LA).
8) CUC8 | Database Audit Logs (OCI Datasafe).
9) CUC9 | OCI Workloads connecting to OD@ Databases.

### **3.1. Autonomous Recovery Service.**


<p align="center">
<img src="../content/cuc1.jpg" width="1000" height="auto">
</p>

### **3.2. Multi-subscription DB Teams.**

<p align="center">
<img src="../content/cuc2.jpg" width="1000" height="auto">
</p>

### **3.3. Manage Customer-managed database encryption keys with OCI Vault.**

<p align="center">
<img src="../content/cuc3.jpg" width="1000" height="auto">
</p>

### **3.4. High availability between AZs/ADs.**

<p align="center">
<img src="../content/cuc4.jpg" width="1000" height="auto">
</p>

### **3.5. High availability between regions.**

<p align="center">
<img src="../content/cuc5.jpg" width="1000" height="auto">
</p>

### **3.6 Basic OCI Exadata Monitoring (Audit Logs, Events, Alarms).**

<p align="center">
<img src="../content/cuc6.jpg" width="1000" height="auto">
</p>

### **3.7 Advanced OCI Database Observability (DBM, OPSI, LA).**

<p align="center">
<img src="../content/cuc7.jpg" width="1000" height="auto">
</p>

### **3.8 Database Audit Logs (OCI Datasafe).**

<p align="center">
<img src="../content/cuc8.jpg" width="1000" height="auto">
</p>

### **3.9 OCI Workloads connecting to OD@ Databases.**

<p align="center">
<img src="../content/cuc9.jpg" width="1000" height="auto">
</p>

## **4. Management of other resources**


### **4.1 Disaster Recovery (DR)**

In this architecture, Disaster Recovery (DR) is implemented by defining two ExaDB-D infrastructures, one acting as primary and the other as standby.

These infrastructures may be placed in the same or in different logical compartments, depending on governance, access control, or organizational requirements. The logical placement does not impact the DR mechanism itself, which is defined at the database layer.

Database protection is implemented using Data Guard, with associations established between database clusters running on different infrastructures. This ensures that each workload is replicated across independent platforms, providing resilience and continuity in case of failure.

From an operational perspective, Production and DR resources are typically managed by the same administrative teams, following the administrative model defined for the Landing Zone.

Cost allocation between primary and DR deployments can be managed through the use of OCI tags, applied consistently to the corresponding infrastructure and database resources.

This approach provides a consistent and scalable DR model, where protection is based on databases located in different VM clusters, running on separate ExaDB-D infrastructures, replicating database information between CDBs, while maintaining flexibility in terms of logical organization, cost tracking, and operational ownership.

To know more about how to use Data Guard on ExaDB-D environments you can check the public document [Use Oracle Data Guard with Oracle Exadata Database Service on Cloud@Customer](https://docs.oracle.com/en-us/iaas/exadata/doc/ecc-using-data-guard.html).

### **4.2 Operator Access Control**

Oracle Operator Access Control is an OCI compliance and auditing service that provides visibility into when Oracle operators require access to the underlying ExaDB-D infrastructure for maintenance or issue resolution. It offers near real-time audit trails of all actions performed by Oracle personnel.

In this architecture, the service is typically managed by the Security Team and is therefore deployed in the Global Shared Security compartment. The Landing Zone extension includes IAM policies that grant the appropriate permissions for managing this service.

Additionally, OCI Event Rules are configured to capture Operator Access Control activities and route them to the corresponding Notification Topics, ensuring that security teams are informed of all relevant events.

An alternative design may place Operator Access Control resources within environment-specific security compartments, enabling dedicated security teams to manage infrastructure access independently per environment. This approach may be particularly relevant in multi-tenant or multi–Operating Entity (OE) scenarios, where each OE manages its own infrastructure.

To know more about the Oracle Operator Access Control you can check the public document [Oracle Operator Access Control](https://docs.oracle.com/en-us/iaas/operator-access-control/index.html).

### **4.3 Software Images**

Oracle provides the capability to define custom Database Software Images and Grid Infrastructure Software Images in OCI. These images represent curated versions of Oracle software, including specific Release Updates (RUs) and optional one-off patches, allowing organizations to standardize the software stack used across their database platforms.

These software images can be leveraged both for provisioning new Oracle or Grid Infrastructure Homes and for performing in-place patching of existing homes, enabling a consistent and controlled approach to software lifecycle management.

In this architecture, the placement of software images is not fixed and depends on the selected use case and operational model. Software images can be managed as shared resources or as environment-specific resources, depending on the required level of isolation and governance.

When a shared model is adopted, software images are typically placed in shared DB Platform Layer compartments, allowing reuse across multiple environments and supporting a controlled lifecycle promotion model, where versions are validated in non-production environments before being promoted to production.

In contrast, in more isolated models, software images may be placed in environment-specific compartments, enabling tighter control, independent lifecycle management, and alignment with dedicated operational teams per environment.

IAM policies are defined accordingly to grant the appropriate DBA teams permissions to manage and use these images, ensuring consistency with the overall administrative model.

This flexible approach ensures consistency in software deployment while allowing the architecture to adapt to different organizational, operational, and governance requirements.

For more information, refer to the official documentation [Manage Software Images](https://docs.oracle.com/en/engineered-systems/exadata-cloud-at-customer/ecccm/ecc-oracle-database-software-images.html#GUID-93D6419A-DD43-45E0-BF69-92E8907C6652).

### **4.4 Backup Destinations**

ExaDB-D supports multiple backup options, including integration with external systems such as on-premises Network File Systems (NFS) and Zero Data Loss Recovery Appliance (ZDLRA), allowing organizations to align database backups with their enterprise backup strategy.

OCI provides the Backup Destination resource to register and use these external systems within ExaDB-D. Backup configuration is defined in relation to the database platforms rather than as an independent resource.

In this architecture, it is a design decision to define Backup Destinations in the same compartment as their associated database platforms ensuring alignment between backup configuration and the administrative scope of the databases.

In VMC-based deployments, backup configuration is managed at the CDB level, following the scope of the VMC. In Autonomous deployments, backup configuration is defined at the ACD level and inherited by all ADB-D databases, even when these are deployed in project-level compartments. This creates a clear separation between database placement and backup configuration.

This approach is recommended as it simplifies IAM policy management, maintains clear ownership boundaries, and ensures consistency with the operational model of the database platforms. Alternative placements may be considered, but they typically introduce additional complexity without clear benefits.

IAM policies are defined accordingly, allowing DBA teams to manage backup configuration within the scope of the database resources they administer.

For more information, refer to the official documentation [Creating Database Backup Destinations for Oracle Exadata Database Service on Cloud@Customer](https://docs.oracle.com/en/engineered-systems/exadata-cloud-at-customer/ecccm/ecc-create-bkup-dest.html#GUID-24E43ABF-29D3-4660-BB2C-3FCAF8424293).

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
