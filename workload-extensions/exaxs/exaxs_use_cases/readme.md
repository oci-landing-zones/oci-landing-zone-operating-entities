# ExaDB-XS Use Cases <!-- omit from toc -->

## **Table of Contents** <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Use Cases**](#2-use-cases)
  - [**2.1 Shared ExaDB-XS Platform**](#21-shared-exadb-xs-platform)
  - [**2.2 Hybrid ExaDB-XS Platform**](#22-hybrid-exadb-xs-platform)
  - [**2.3 Dedicated ExaDB-XS Platform**](#23-dedicated-exadb-xs-platform)
- [**3. Design Decisions**](#3-design-decisions)
- [**4. Management of other resources**](#4-management-of-other-resources)
  - [**4.1 Disaster Recovery (DR)**](#41-disaster-recovery-dr)
  - [**4.2 Software Images**](#42-software-images)
  - [**4.3 Backup Destinations and Storage Capacity**](#43-backup-destinations-and-storage-capacity)
  - [**4.4 Implementation Boundary**](#44-implementation-boundary)

&nbsp;

## **1. Summary**

Oracle Exadata Database Service on Exascale Infrastructure (ExaDB-XS) uses Oracle-managed physical infrastructure. Its customer-managed service layer consists principally of **Exascale Database Storage Vaults** and **ExaDB-XS VM Clusters**. A VM Cluster supplies the database compute environment; its selected Storage Vault supplies database storage. Database Homes, container databases (CDBs), and pluggable databases (PDBs) form the regular database stack on the cluster. There is no customer-managed dedicated Exadata infrastructure resource in this architecture. See the [service overview](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/overview-exadb-xs-service.html).

These three use cases illustrate compartment and administrative boundaries within a One-OE Landing Zone:

1. **Shared platform:** shared Storage Vaults and VM Clusters for multiple environments.
2. **Hybrid platform:** shared Storage Vaults with VM Clusters and networks owned per environment.
3. **Dedicated platform:** separate Storage Vaults, VM Clusters, and networks per environment.

These use cases can be viewed through either a [single-stack package](../single-stack/readme.md), which publishes One-OE foundation and ExaDB-XS prerequisite JSON, or a [multi-stack design](../multi-stack/readme.md), which remains an architecture reference. The single-stack files do not provision ExaDB-XS Vaults, VM Clusters, or databases.

The choice controls IAM scope and lifecycle ownership, not the tenancy of the physical servers. A shared vault can serve multiple VM Clusters, including clusters in other compartments. However, Oracle Database 19c clusters use Exascale *block* storage with ASM, while Oracle AI Database 26ai clusters use Exascale *smart* storage without ASM. Oracle does not permit both modes in one VM Cluster or a smart-storage cluster to share a vault with a block-storage cluster. Where an environment needs both releases, repeat the appropriate vault-and-cluster pattern for each storage mode. See the [service overview](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/overview-exadb-xs-service.html) and [VM Cluster creation guidance](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/manage-vm-clusters.html).

This document is a design reference. The [single-stack package](../single-stack/readme.md) publishes generated foundation and prerequisite configuration, including ExaDB-XS IAM policies. The groups below describe the intended operating model; review the generated grants before deployment. ExaDB-XS service resources are not provisioned by that package.

## **2. Use Cases**

The diagrams use blue for primary and yellow for DR examples, dark platform blocks for shared scopes, and lighter blocks for environment scopes. Their A–G markers identify Storage Vaults, VM Clusters, software images, administrative groups, Events, Alarms, and Notifications respectively. They show example compartment names, networks, and CIDRs rather than validated customer allocations.

### **2.1 Shared ExaDB-XS Platform**

<p align="center">
<img src="../content/exaxs_use_case_1.png" width="1000" height="auto" alt="UC1 shared vaults, clusters, network, and observability">
</p>

#### **ExaDB-XS Resources**

In UC1, the shared platform has a global ExaDB-XS Storage Vault scope and a global database scope. The diagram places a primary and a DR-labelled Storage Vault <img src="../content/a.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="A"> in the shared platform infrastructure compartment and corresponding VM Clusters <img src="../content/b.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="B"> in the shared platform database compartment. Each VM Cluster is associated with its intended vault. These are logical customer resources; Oracle operates the underlying physical infrastructure.

The database VCN is in the global network compartment. Its illustrated client and backup subnets provide database connectivity and backup traffic paths. The VCN and subnet CIDRs are examples only. Routing, NSGs or security lists, DNS, and service access must be designed for the actual landing zone. Database Homes, CDBs, and PDBs associated with the shared clusters are administered at the shared platform scope. This is appropriate when the same central team can own the lifecycle and access of workloads from multiple environments. It does not give production and pre-production database teams separate compartment control over their PDBs.

The diagram places database and GI software-image symbols <img src="../content/c.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="C"> in the shared database compartment. Customer-managed **database software images** are documented for creating and updating Database Homes. The GI software-image symbol is not treated here as an established ExaDB-XS customer resource; see [Software Images](#42-software-images).

#### **ExaDB-XS Groups**

The administrative groups <img src="../content/d.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="D"> follow the shared resource ownership model.

- **Global Infra Admin Team** owns the shared Storage Vault lifecycle and VM Cluster capacity, maintenance, and network attachment coordination.
- **Global DBA Team** owns shared Database Homes, CDBs, PDBs, backup configuration, and approved database software images.
- **Global Network Admin Team** owns the shared VCN, subnets, routing, and network security controls.
- **Global observability and security teams** own the event rules, alarms, notification topics, subscriptions, and access to their message destinations.

Separate infra and DBA responsibilities are an operating model, not an OCI guarantee. Creating or deleting an ExaDB-XS VM Cluster has documented dependencies on `manage db-homes`, `manage databases`, `use exascale-db-storage-vaults`, `use vnics`, and `use subnets`; updating a cluster can also require network permissions. Thus a narrowly scoped infrastructure role may need a coordinated privileged workflow or additional grants in the appropriate compartments. Avoid granting broad `database-family` solely for convenience. Validate every operation against the [ExaDB-XS IAM policy details](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadb-xs-policy-details.html).

#### **ExaDB-XS Observability**

**Events.** Event rules <img src="../content/e.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="E"> can route Storage Vault creation, update, or deletion events and ExaDB VM Cluster creation, update, or deletion events to global topics. For example, Oracle lists `com.oraclecloud.DatabaseService.UpdateExascaleDbStorageVault.end` and `com.oraclecloud.DatabaseService.UpdateExadbVmCluster.end`. Configure rules for the resource compartments actually used and select the ExaDB-XS event types. See the [ExaDB-XS event catalog](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadata-cloud-infrastructure-events.html).

**Alarms.** Define alarms <img src="../content/f.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="F"> for the shared VM Clusters and databases. The following alarm purposes use ExaDB-XS metrics published by Oracle:

- Database CPU and storage utilization: `CpuUtilization` and `StorageUtilization` in `oci_database`
- VM Cluster CPU, filesystem, memory, and swap utilization: `CpuUtilization`, `FilesystemUtilization`, `MemoryUtilization`, and `SwapUtilization` in `oci_database_cluster`
- VM node availability: `NodeStatus` in `oci_database_cluster`
- Exascale Vault utilization reported through the consuming VM Cluster: `ExascaleVaultUtilization` in `oci_database_cluster`

Where multiple shared clusters use a vault, coordinate vault-capacity alarms across their metric streams so that ownership and notifications remain clear. If Database Management is enabled, additional database metrics may be available in `oracle_oci_database`. Choose dimensions, thresholds, and recipients after confirming the actual streams; no alarm is deployed by this design document. See the [ExaDB-XS Monitoring metrics reference](https://docs.oracle.com/en/engineered-systems/exadata-database-exascale/exdxs/metrics-exadb-xs-monitoring-service.html).

**Notifications.** The diagram places Notifications <img src="../content/g.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="G"> in the global security compartment. Topics can receive alarm actions and event-rule messages, with subscriptions controlled by the security or operations team. The global team must account for environment-specific recipients because events from shared clusters cannot be separated by compartment alone.

### **2.2 Hybrid ExaDB-XS Platform**

<p align="center">
<img src="../content/exaxs_use_case_2.png" width="1000" height="auto" alt="UC2 shared vaults with environment VM Clusters and networks">
</p>

#### **ExaDB-XS Resources**

UC2 keeps the primary and DR-labelled Storage Vaults <img src="../content/a.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="A"> in the shared platform infrastructure compartment. Production and pre-production each have their own ExaDB-XS VM Clusters <img src="../content/b.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="B"> in their environment platform database compartment. Each cluster selects the appropriate existing vault. Oracle's VM Cluster creation flow explicitly allows selecting a vault in another compartment, subject to the caller having the required access there. The shared vault remains under global lifecycle ownership; it is not moved into an environment simply because an environment cluster consumes it. See [Manage VM Clusters](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/manage-vm-clusters.html).

Each environment has its own VCN and illustrated client and backup subnets in its environment network compartment. Database Homes, CDBs, PDBs, and any customer-managed database software images <img src="../content/c.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="C"> are in the corresponding environment database scope. The diagram's primary and DR cluster symbols within each environment represent a possible protection pair, not an automatically established Data Guard association.

The shared vault forms a deliberate operational dependency across environments. Capacity changes, deletion, and storage-mode compatibility require global coordination. A shared vault cannot bridge a 19c block-storage cluster and a 26ai smart-storage cluster; use distinct vaults for those modes even when both remain in the shared compartment.

#### **ExaDB-XS Groups**

The administrative groups <img src="../content/d.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="D"> divide shared vault ownership from environment operations.

- **Global Infra Admin Team** creates, scales, and retires the shared Storage Vaults and governs their capacity and allocation.
- **Env Infra Admin Team (per environment)** operates that environment's VM Clusters. It needs the documented vault-use dependency in the shared vault compartment and the required network access in that environment's network compartment for relevant cluster operations. It does not need general vault-management authority merely to consume a vault.
- **Env DBA Team (per environment)** owns Database Homes, CDBs, PDBs, backups, and database software images in its environment database compartment.
- **Env Network Admin Team and observability team (per environment)** own the environment VCN and event rules, alarms, and notification delivery respectively; global teams retain shared-vault event and topic ownership.

The [ExaDB-XS IAM policy reference](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadb-xs-policy-details.html) distinguishes `exascale-db-storage-vaults` from `exadb-vm-clusters`. `use` on the shared vault supports the cluster dependency but also includes vault update operations, so least privilege may require permission-level conditions and operational review. Cluster creation and deletion also need the database-home, database, VNIC, and subnet permissions listed by Oracle. Policies must explicitly cover the shared vault compartment and the environment cluster and network compartments; a grant in one does not automatically cover the others. The [single-stack identity files](../single-stack/readme.md#3-deployment-steps) implement the published UC1–UC3 examples; validate them against the intended groups and operational workflows.

#### **ExaDB-XS Observability**

**Events.** Global rules <img src="../content/e.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="E"> watch the shared vault compartment for vault lifecycle operations. Environment rules watch their VM Cluster and database compartments. Oracle lists distinct ExaDB-XS vault and cluster event types, including `com.oraclecloud.DatabaseService.CreateExascaleDbStorageVault.end` and `com.oraclecloud.DatabaseService.CreateExadbVmCluster.end`. Route shared-vault changes to global operations and cluster/database changes to the owning environment. A shared-vault alert may affect more than one environment. See the [event catalog](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadata-cloud-infrastructure-events.html).

**Alarms.** Environment alarms <img src="../content/f.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="F"> evaluate their own VM Cluster and database streams. The following purposes mirror the shared model while preserving environment ownership:

- Database CPU and storage utilization: `CpuUtilization` and `StorageUtilization` in `oci_database`
- VM Cluster CPU, filesystem, memory, and swap utilization: `CpuUtilization`, `FilesystemUtilization`, `MemoryUtilization`, and `SwapUtilization` in `oci_database_cluster`
- VM node availability: `NodeStatus` in `oci_database_cluster`
- Shared Exascale Vault utilization: `ExascaleVaultUtilization` in the consuming cluster's `oci_database_cluster` stream, with global capacity ownership and notification to every affected environment

Coordinate the shared-vault signal across clusters to avoid duplicate or inconsistent alerts. Add `oracle_oci_database` only for metrics available when Database Management is enabled. Confirm streams, dimensions, and thresholds after provisioning. See the [ExaDB-XS Monitoring metrics reference](https://docs.oracle.com/en/engineered-systems/exadata-database-exascale/exdxs/metrics-exadb-xs-monitoring-service.html).

**Notifications.** Global security topics <img src="../content/g.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="G"> receive shared-vault signals. Environment security topics receive their cluster, database, and alarm signals. Configure subscriptions and access so global events reach the environment owners whose clusters use the affected vault.

### **2.3 Dedicated ExaDB-XS Platform**

<p align="center">
<img src="../content/exaxs_use_case_3.png" width="1000" height="auto" alt="UC3 environment vaults, clusters, networks, and observability">
</p>

#### **ExaDB-XS Resources**

UC3 places a primary and DR-labelled Storage Vault <img src="../content/a.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="A"> in each environment's ExaDB-XS infrastructure compartment and corresponding VM Clusters <img src="../content/b.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="B"> in that environment's platform database compartment. Production and pre-production have separate vault capacity, cluster lifecycles, database resources, and network VCNs. The diagram shows client and backup subnets for each VCN. This is dedicated *logical* placement; the Exascale hardware remains Oracle-managed and shared at the service level.

Within each environment, Database Homes, CDBs, PDBs, and approved database software images <img src="../content/c.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="C"> belong to the environment database scope. Additional vaults and clusters are required if that environment uses both 19c block storage and 26ai smart storage. The `exaxs-infra` compartment contains the customer-managed Storage Vaults shown in the diagram; it does not represent customer-managed physical Exadata infrastructure.

#### **ExaDB-XS Groups**

The administrative groups <img src="../content/d.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="D"> follow environment ownership.

- **Env Infra Admin Team (per environment)** owns the Storage Vaults in its environment's `exaxs-infra` compartment and the VM Clusters in its environment's database compartment, and coordinates capacity, maintenance, and cluster networking.
- **Env DBA Team (per environment)** manages Database Homes, CDBs, PDBs, backups, and database software images in the same environment.
- **Env Network Admin Team and observability team (per environment)** manage VCN controls, event rules, alarms, topics, and subscriptions for their environment.
- **Global governance teams** may set standards and audit access, but no global team needs routine management of the environment's vault or cluster solely because the service uses Oracle-managed infrastructure.

The OCI [policy reference](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadb-xs-policy-details.html) supports separate resource types for vaults, clusters, Database Homes, databases, and images. Cluster lifecycle calls nevertheless require permissions on dependent database and network resources. A cluster operator must have the documented vault-use permission in the environment's `exaxs-infra` compartment as well as cluster permissions in the environment database compartment and network permissions in the environment network compartment. Grant the required operations only in these actual resource compartments and test the workflow. Environment isolation comes from compartment-scoped grants and network controls, not from separate physical Exadata hardware.

#### **ExaDB-XS Observability**

**Events.** Environment rules <img src="../content/e.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="E"> cover its vault and cluster lifecycle events and database events. Oracle's ExaDB-XS event table includes `com.oraclecloud.DatabaseService.ChangeExascaleDbStorageVaultCompartment.end` and `com.oraclecloud.DatabaseService.ChangeExadbVmClusterCompartment.end`; compartment moves warrant particular review because they can alter the intended ownership boundary. See the [event catalog](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadata-cloud-infrastructure-events.html).

**Alarms.** Define separate alarms <img src="../content/f.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="F"> for each environment's VM Clusters, databases, and vault capacity:

- Database CPU and storage utilization: `CpuUtilization` and `StorageUtilization` in `oci_database`
- VM Cluster CPU, filesystem, memory, and swap utilization: `CpuUtilization`, `FilesystemUtilization`, `MemoryUtilization`, and `SwapUtilization` in `oci_database_cluster`
- VM node availability: `NodeStatus` in `oci_database_cluster`
- Environment Exascale Vault utilization reported through its VM Cluster: `ExascaleVaultUtilization` in `oci_database_cluster`

If Database Management is enabled, assess additional metrics in `oracle_oci_database` separately. Validate dimensions, thresholds, and notification recipients against actual streams after provisioning. See the [ExaDB-XS Monitoring metrics reference](https://docs.oracle.com/en/engineered-systems/exadata-database-exascale/exdxs/metrics-exadb-xs-monitoring-service.html).

**Notifications.** Environment topics <img src="../content/g.png" style="height: 1.5em; vertical-align: text-bottom; margin: 0 2px;" alt="G"> in the environment security compartment distribute its vault, cluster, database, and alarm messages. Global security can subscribe or receive forwarded messages for common oversight without taking operational ownership of the environment resources.

## **3. Design Decisions**

**Administrative Model.** The boundary is the customer-managed Storage Vault, VM Cluster, database stack, and their compartments. Global ownership is appropriate for a shared vault; environment ownership is appropriate for environment clusters and databases. The policy reference identifies `exascale-db-storage-vaults`, `exadb-vm-clusters`, `db-homes`, `databases`, `pluggable-databases`, and `database-software-image` as relevant types. OCI IAM `manage` is not a complete cluster workflow by itself: Oracle lists cross-resource dependencies for create, delete, update, and compartment moves. Review the [permission tables](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadb-xs-policy-details.html) when implementing each role.

| Resource or dependency | UC1 ownership and compartment | UC2 ownership and compartment | UC3 ownership and compartment |
| --- | --- | --- | --- |
| Exascale Storage Vault (`exascale-db-storage-vaults`) | Global Infra Admin; shared `exaxs-infra` | Global Infra Admin; shared `exaxs-infra` | Env Infra Admin; environment `exaxs-infra` |
| VM Cluster (`exadb-vm-clusters`) | Global Infra Admin; shared ExaDB-XS database compartment | Env Infra Admin; environment ExaDB-XS database compartment | Env Infra Admin; environment ExaDB-XS database compartment |
| Database Homes, CDBs, PDBs, backups, and database software images | Global DBA; shared database compartment | Env DBA; environment database compartment | Env DBA; environment database compartment |
| VCN, client subnet, backup subnet, and related network controls | Global Network Admin; shared network compartment | Env Network Admin; environment network compartment | Env Network Admin; environment network compartment |

The operator who creates or deletes a VM Cluster needs the cluster permission and Oracle's documented `manage db-homes`, `manage databases`, `use exascale-db-storage-vaults`, `use vnics`, and `use subnets` dependencies in the compartments where those resources reside. `use exascale-db-storage-vaults` also permits vault updates, so the generated policies require review against the exact API workflow. Database administration remains with the DBA team through a coordinated workflow or narrowly scoped dependent grants. Unlike the ExaDB-D Autonomous pattern, these use cases do not give Project DBA groups an independent ADB-D compartment; no Autonomous resources are part of this extension. The table defines responsibilities; the single-stack identity JSON contains example OCI grants that implement them.

**Visual Representation (Diagram Interpretation).** The `exaxs-infra` boxes identify the compartments that hold Storage Vaults in all three use cases. They do not represent a customer-managed dedicated Exadata infrastructure resource. In UC3, each environment has its own `exaxs-infra` compartment and Vaults, while its VM Clusters and database stack appear in the environment database compartment. The primary/DR colors indicate intended database roles, not separate physical sites, configured replication, or a guarantee of fault-domain isolation. The diagrams also show a **GI SW Image** icon. Oracle's ExaDB-XS [software-image guidance](https://docs.oracle.com/en/engineered-systems/exadata-database-exascale/exdxs/ecc-manage-images.html) verifies customer-created *database* software images and their use with Database Homes, but does not establish the pictured GI image as a customer-managed ExaDB-XS artifact. It must not be included in an implementation on the strength of the diagram alone.

**Networking Strategy.** A VM Cluster uses customer-selected network resources. UC1 illustrates a shared VCN; UC2 and UC3 illustrate one VCN per environment. The client and backup subnet names and CIDRs are illustrative. Plan address space, connectivity, service-gateway access, DNS, routing, and NSGs for the real deployment. Oracle notes that VM Cluster Events and metrics depend on working egress to OCI services; a private deployment can use a service gateway and HTTPS 443 to the regional Oracle Services Network. See [event prerequisites](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadata-cloud-infrastructure-events.html) and [VM Cluster management](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/manage-vm-clusters.html).

**Resource Placement Strategy.** A vault can be selected across compartments, but cluster users need permission in the vault's compartment. Shared vault capacity and lifecycle therefore remain a shared dependency in UC1 and UC2. A cluster and its database stack are managed under its chosen platform scope; avoid claiming independent project-level database ownership from a PDB icon. For an environment that needs independent DBA lifecycle or a different Exascale storage mode, use a separate VM Cluster and appropriate vault. Oracle Database 19c uses ASM-managed Exascale Direct Volumes for DATA, RECO, and LOG; 26ai uses direct smart-storage access and does not use ASM for database files. The 19c database may require both vault capacity and per-database DATA/RECO allocation changes. See the [product overview](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/overview-exadb-xs-service.html).

## **4. Management of other resources**

### **4.1 Disaster Recovery (DR)**

Each diagram pairs primary and DR-labelled ExaDB-XS Storage Vault and VM Cluster symbols. This is a conceptual placement for a primary database and a standby database on a separate ExaDB-XS VM Cluster. Two vault icons alone do not establish replication or guarantee independent physical infrastructure.

An ExaDB-XS standby is not the only OCI-managed option. Oracle also supports a **cross-service Data Guard Group between ExaDB-XS and ExaDB-D (ExaCS)**: the primary can be on either service and the standby on the other. The OCI standby-creation flow lets the operator select ExaDB-D or ExaDB-XS as the target service, so this supported cross-service topology does not require a manually configured Data Guard installation. An ExaDB-D peer is an alternative to the ExaDB-XS-only pair drawn in these diagrams; it is not provisioned by the current extension documentation. See [Cross-Service Data Guard Between ExaDB-D and ExaDB-XS](https://docs.oracle.com/en/engineered-systems/exadata-cloud-service/ecscm/cross-service-data-guard.html).

For Oracle Database 19c on ExaDB-XS, the **Data Guard Group** resource is the supported OCI model. Oracle AI Database 26ai also supports the existing Data Guard Association model, but use the documented Group workflow for the cross-service design described here. The primary and standby must use the same major database release and the same key-management solution, and Data Guard replication uses the client network. Confirm target-service availability in the selected region, network connectivity, IAM, database and backup prerequisites, and switchover and failover behavior before implementation. Other manually managed Data Guard topologies are outside this documented OCI-managed pattern. See [Use Oracle Data Guard with ExaDB-XS](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/using-data-guard-with-exadb-xs.html).

### **4.2 Software Images**

Customer-managed database software images can standardize Database Home creation and updates. UC1 depicts images in the shared database compartment; UC2 and UC3 depict them in each environment's database compartment. The database-image resource type and create/delete operations are listed in the [ExaDB-XS IAM reference](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/exadb-xs-policy-details.html). Oracle describes these images as regional resources and documents their use for provisioning, updating, and standby Database Homes in [Manage Software Images](https://docs.oracle.com/en/engineered-systems/exadata-database-exascale/exdxs/ecc-manage-images.html). The diagrams' GI image symbols need separate service-specific verification before implementation; this document does not assign a GI image IAM policy or lifecycle.

### **4.3 Backup Destinations and Storage Capacity**

ExaDB-XS supports OCI-managed automatic database backups to **Oracle Database Autonomous Recovery Service** or **OCI Object Storage**. Oracle recommends Recovery Service for its managed protection and recovery capabilities; Object Storage remains a supported destination where available. The destination offered when enabling automatic backups can depend on the tenancy creation date, region, database version, Recovery Service limits, and regional capacity, so confirm the choices shown for the target database rather than assuming both are selectable. "Autonomous" in the Recovery Service name refers to the backup service; it does not introduce an Autonomous Database into this workload extension. See [Manage Database Backup and Recovery on ExaDB-XS](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/ecs-managing-db-backup-and-recovery.html).

Configure automatic backup, retention or a Recovery Service protection policy, and recovery options for each container database (CDB) according to its workload requirements. PDB backups follow their CDB's backup destination. The backup subnet shown in the diagrams provides a network path; it is not itself a backup destination or an enabled backup policy. Likewise, an Exascale Storage Vault stores database data and is not a substitute for a database backup. The diagrams do not imply that any backup has been configured. Validate the first successful backup and a restore procedure before relying on the design for recovery. See [Manage Databases on ExaDB-XS](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/manage-databases-exadb-xs.html).

For a Data Guard design, decide whether backups will be configured on the primary, the standby, or both. If backups are configured on both sides of a cross-service ExaDB-XS/ExaDB-D group, Oracle requires the same backup destination type for both databases. Confirm the chosen destination, retention, and restore path for each peer rather than treating Data Guard replication as a backup. See [Cross-Service Data Guard Between ExaDB-D and ExaDB-XS](https://docs.oracle.com/en/engineered-systems/exadata-cloud-service/ecscm/cross-service-data-guard.html).

Storage Vault capacity is managed at vault scope; in a shared model, global owners must monitor allocation and coordinate growth for every consuming environment. For Oracle Database 19c block storage, individual database DATA and RECO allocations also matter; Oracle AI Database 26ai smart storage uses direct vault storage without those ASM disk-group allocations. See the [service overview](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/overview-exadb-xs-service.html) and [VM Cluster management](https://docs.oracle.com/en-us/iaas/exadb-xs/doc/manage-vm-clusters.html).

### **4.4 Implementation Boundary**

The single-stack package publishes generated foundation and ExaDB-XS prerequisite JSON, including IAM, network, Events, Alarms, and Notifications. It does not publish ExaDB-XS Vault, VM Cluster, Database Home, database, backup, or Data Guard provisioning. Multi-stack configuration is not published. Review the generated IAM grants and example notification settings; confirm region availability, service limits, metrics, and operational workflows before deployment.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
