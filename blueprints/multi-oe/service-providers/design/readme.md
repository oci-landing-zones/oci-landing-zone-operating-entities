# **The OCI Open LZ &ndash; Multi-OE Service Providers [Blueprint](#)**

### A Blueprint to Simplify the Onboarding of Organizations, Business Units, and Subsidiaries into OCI

&nbsp; 

**Table of Contents**

- [1. Introduction](#1-introduction)
- [2. Security View](#2-security-view)
- [3. Runtime View](#3-runtime-view)

&nbsp; 

# **1. Introduction**

This blueprint defines a tenancy model for service providers that is based on OCI Core Landing Zone (formerly known as OCI CIS Landing Zone) principles. It is designed for managed service providers to onboard OCI in a streamlined manner that aligns with the CIS OCI Benchmark and best practices. Two variations are provided:

1. **Pod model**: each customer gets a copy of the application stack and has its own separate data stack. This pattern can be seen in SaaS and managed services industries where each customer's environment is independent of another, and the only shared part is the management plane. 

![architecture-pod](images/architecture-pod.png)

2. **Multi-tenant model**: the application stack is shared by the service provider customers. Customer segregation is defined through constraints available in the framework that underpins the application layer. Typically, the service provider manages a single multi-tenant application stack that is split in multiple customer spaces. The data layer has a shared infrastructure and customers data are segregated through available constraints in the data processing technology, like portable databases within Exadata Cloud Service, multiple Oracle Autonomous databases, or more simplistically, separate schemas within a shared database. 

![architecture-mt](images/architecture-mt.png)

Both models have a management plane that hosts shared services for the application layer and for itself, including network security, observability, monitoring and DevOps.

# **2. Tenancy Structure**

The blueprint separates the management plane from the application layer using compartments, as depicted in the following diagram. [Click here](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/content/blueprints/multi-oe/saas/OCI_Open_LZ_Multi-OE_SaaS_Blueprint.drawio) to download the drawio version.


## 2.1 Enclosing Compartment

The enclosing compartment (in white color) sets the boundaries of the service provider landing zone. The enclosing compartment can be a single landing zone hosting multiple lifecycle environments, with a shared management plane and lifecycle environments denoted by multiple embedded compartments for the application layer. The enclosing compartment can also represent an entire lifecycle environment, with entirely distinct management planes and application layers. 

## 2.2 Management Plane Compartment

The management plane compartment (in light yellow color) is designed to host shared services for the application layer and for the management plane itself, including network security, observability, monitoring and DevOps. 

### 2.2.1 Network Compartment

The Network compartment (in firm yellow color) is designed to host the Virtual Cloud Networks (VCNs) that support the management plane services, including a Hub VCN for inspection of any incoming/outgoing network traffic to/from the application layer, as well as any VCNs for other eventual supporting services, like OCI functions, OKE clusters, management tools, etc.

### 2.2.2 Security Compartment

The Security compartment (in firm yellow color, below the Network compartment) is designed to host any services related to security, observability and monitoring in general, including Vaults, Logs, Streams, Connector Hub, to name a few.

### 2.2.3 Shared Services Compartment

The Shared Services compartment (in firm yellow color, below the Security compartment) is designed to host any services or tooling that are neither network nor security. Examples are a 3rd-party Kubernetes management solution, Oracle Enterprise Manager or a DevOps framework. 

## 2.3 Customers Compartment

The Customers compartment (in light blue color) is designed to host the service provider application, including the data layer. In the Pod model, each customer is assigned its own compartment and executes a copy of the application within a dedicated application network. In the multi-tenant model, a common application infrastructure is shared among customers.

### 2.3.1 Application Lifecycle Compartment

The Application Lifecycle compartment (in light blue color) is designed to host an application lifecycle environment, like Dev, Test, Prod. In the Pod model, it encloses the various customer compartments wherein the application is deployed. In the multi-tenant model, it encloses the customer shared application infrastructure for that environment. Additionally, it hosts data caching layer and may also host customer dedicated databases.

### 2.3.2 Shared Database Compartment

The Shared Database compartment (dashed, in firm blue color) is designed for service providers using a shared infrastructure platform for the data layer. Typically, a single infrastructure serves multiple lifecycle environments and customer application workloads. One typical instantiation of such pattern is Oracle Exadata platform (Cloud Service or Cloud@Customer). Depending on customer requirements, multiple infrastructure platforms matching lifecycle environments is also a valid option.


## 3. Administration Groups

Following CIS OCI Benchmark recommendations on segregation of duties, the blueprint defines multiple IAM groups for managing different aspects of the tenancy infrastructure:

**IAM Administrators:** manage IAM services and resources including compartments, groups, dynamic groups, policies, identity providers, authentication policies, network sources, tag defaults. However, this group is not allowed to manage the out-of-box Administrators and Credential Administrators groups. It's also not allowed to touch the out-of-box Tenancy Admin policy.

**Credential Administrators:** manage users capabilities and users credentials in general, including API keys, authentication tokens and secret keys.

**Cost Administrators:** manage budgets and usage reports.

**Auditors:** entitled with read-only access across the tenancy and the ability to use cloud-shell to run the [CIS compliance checker script](https://github.com/oci-landing-zones/oci-cis-landingzone-quickstart/blob/main/compliance-script.md).

**Announcement Readers:** for reading announcements displayed in OCI Console.

**Network Administrators:** manage OCI network family, including VCNs, Load Balancers, DRGs, VNICs, IP addresses, etc.

**Security Administrators:** manage security services and resources including Vaults, Keys, Logging, Vulnerability Scanning, Web Application Firewall, Bastion, Service Connector Hub, etc.

**Shared Services Administrators:** manage OCI services that support the overall solution, but are neither network nor security related, for example, a 3rd-party Kubernetes management solution, Oracle Enterprise Manager or a DevOps framework.

### 2.2.3 Customer Groups

**Customer Administrators:** manage application stacks deployments and related resources in the Customer Compartment.  OCI resources include Compartments, Network, Compute images, Database OCI Functions, Kubernetes clusters, Streams, Object Storage, Block Storage, File Storage, Keys, Budgets, and others.

&nbsp; 

## 2.3 Posture Management

**Oracle Cloud Guard:** activity, configuration, and threat detector recipes are defined at the tenancy level to examine your resources for security weaknesses and to monitor operators and users for risky activities.

**Policies:** IAM policies which grants access to the tenancy level wide administrator groups as the IAM, credentials, cost administrator groups, announcement readers, auditors and the specific ISV enclosing, and shared services compartments. It will also contain OCI services needed policies.

**Events:** The events related to CRUD (Create, Read, Update or Delete) state changes of tenancy level resources, as Budget events or Cloud Guard events or reported problems.

**Budgets:** The budgets configured will emit events when reaching the percentage or amount of money configured for a given budget. It will fire an event that can be integrated with the OCI Notification services.

**Subscriptions:** The OCI notification subscription will let the subscribers to receive information about an specific topic, as budget topic. By default the subscription type will be by e-mail.

&nbsp; 

# 3. Runtime View
This chapter is presented [here](/blueprints/multi-oe/service-providers/runtime/readme.md) and guides the **deployment** activities to provision this blueprint.

