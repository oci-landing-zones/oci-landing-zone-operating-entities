# **The OCI Open LZ &ndash; Multi-Tenancy [Blueprint](#)**

### A Blueprint to Simplify the Onboarding of Organizations, Business Units, and Subsidiaries into OCI

&nbsp; 

**Table of Contents**

[1. Introduction](#1-introduction)</br>
[2. Functional View](#2-functional-view)</br>
[3. Security View](#3-security-view)</br>
[4. Network View](#4-network-view)</br>
[5. Operations View](#5-operations-view)</br>
[6. Runtime View](#6-runtime-view)

&nbsp; 

# **1. Introduction**

The OCI Open LZ is a set of public and open assets to onboard OCI, available in a dedicated [Git Repository](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities), containing several design **blueprints**, **IaC** configuration **examples**, and **enablement** activities.

This document is a subset of the OCI Open LZ, and it provides an executive summary of the **Multi-Tenancy blueprint**. 

&nbsp; 

## **1.1 Purpose**

The purpose of this document is to:
1. Provide a **multitenancy landing zone design** ready to onboard organization units (OU) and its functional divisions with their teams and projects. These OUs will be identified as **Operating Entities (OE)**, as there is an operating team (customer or partner) responsible for the management of a set of resources.
2. Provide a **cloud-native operating model** to simplify and scale **day two operations**.
3. **Enable customers, partners**, and the **general IT community** to **create their landing zones** with lower efforts through a comprehensive Oracle Cloud Infrastructure (OCI) reference architecture. To support this objective, all the architecture diagrams are provided in a reusable format.
4. **Provide tailoring guidelines** to help adjust the model. This asset can be used directly, tailored, or used as inspiration to create a new one - as it is not a prescribed solution.



&nbsp; 
&nbsp; 

## **1.2 Vision**

The OCI Multi-Tenancy Landing Zone, is a secure cloud environment, designed with best practices to simplify the **onboarding of organization units** (e.g., Line-of-Business, Operating Entities, OpCos, Subsidiaries, Brands, Products, Departments, etc.) into **several OCI tenancies** and enable the continuous operations of their cloud resources. This blueprint expands the One-OE and Multi-OE blueprints and key entities to simplify large organizational deployments. Find below some of its key characteristics.


&nbsp; 

<img src="images/oci_open_lz_multitenancy_hl_design.jpg" alt= “” width="1000" height="value">

&nbsp; 

| # | CHARACTERISTICS| DESCRIPTION   | 
|---|---|---|
| 1 | **Two Entity Types** | There are two types of entities in this blueprint, the ones that provide central shared services to their customers and the customers themselves. The former is a Central Operating Entity (OE) and the latter are organization, customers, or partners OEs.
| 2 | **Central Operating Entity**| This type of entity provides central shared services to all OEs customers and their tenancies. The Connectivity Hub (CH) is an example of this type of services, where all OEs can be connected to the CH, which will control network traffic in and out of OCI.
| 3 | **Customer Operating Entities**| An Operating Entities is responsible for the operation of their Tenancy. Note that a customer in this case can be seen as a organization, brand, partner, LoB, Departments, etc. It's teams, and even their possible OE "customers" with their workloads, will be deplopyed and run in a standard and homologated landing zone blueprint.
| 4 | **Blueprints Catalog** | This element provides a pre-defined set of Landing Zones Blueprints. Each OE can choose the most suitable blueprint available on a catalog of standard blueprints. In this case the One-OE or Multi-OE Blueprints are used, but on a customer scenario these options can be adjusted to any other Landing Zone blueprints. It is recommented that all tenancies follow a blueprint standard, but there might be some cases described below where this can be difficult to enforce.
| 5 | **Tenancy Types** | There will be available several tenancy types for each Blueprint, such as centrally connected, unconnected, managed or unmanaged, which are flavours of blueprints in terms of security, network, and operations. At onboarding type, each Customer OE has to choose the Landing Zone Blueprint and its Tenancy Type.
| 6 | **Secure Onboarding** | .
| 7 | **Cloud Native Operating Model** | The Landing Zone blueprint can be operated with a complete GitOps operating model on day two, using control version repositories as the single source of truth for operations and code. The OCI Open LZ uses a 100% declarative Infrastructure as Code (IaC) approach, with IaC configurations on git-versioned repositories.
| 8 | **Automation Patterns** | The Landing Zone blueprint has a set of operations scenarios for provisioning and changing resources, providing the building blocks to design and automate any other repeatable operations.

&nbsp; 

If **cloud landing zones** are analogous to **airports**, the OCI Open LZ [Multi-Tenancy Blueprint](#) is a connected set of highly secure and scalable airports providing service to a country, covering a set of areas (Tenancies) where each has the possibility of having different terminals (Environments) with dedicated security posture (domestic, international, etc.) and potentially operated by different teams, where communication between those terminals and airports is highly controlled and secured. 

&nbsp; 

## **1.3 Scope and Organization**

This Multi-Tenancy Blueprint is presented with several design views built on top of each other, as an incremental and repeatable approach, that can be used and tailored by any customer or partner setting up an OCI Landing Zone. Each view is explored in a dedicated chapter:
1.	The **Functional View** presents the key concepts and user stories used in the design. 
2.	The **Security View** presents the core building blocks of the tenancy organization and security design. 
3.	The **Network View**, designed on top of the security, presents how network elements are structured, segregated, and connected to communicate with each other. 
4.	The **Operations Vie**w presents the dynamic elements with monitoring and an operating model ready for day 1 and day 2 operations – for provisioning and changing the OCI resources. 
5.	The **Runtime View** presents the executable elements with the operations artifacts to demonstrate how day 2 operations can run using IaC configurations.

This approach and its views provide a consistent design to simplify the onboarding of OCI with an existing blueprint, that can be changed and tailored toward different objectives. Note the order in which these views are presented is itself a best practice, and it's crucial to reproduce the approach with lower efforts and less rework. Therefore, changing security elements will impact the network elements, and any change in these will impact operations. Any change in the operations view will naturally impact the runtime elements.


Before proceeding, it’s highly recommended OCI foundational knowledge of its core services and resources, such as Compartments, Groups, Policies, DRG, VCNs, Subnets, Route tables, Security Lists, Network Security Groups, among others. For the operations view it’s recommended intermediate knowledge of version control systems, pipelines, and infrastructure-as-code (IaC).

&nbsp; 
&nbsp; 

# **2. Functional View**

This chapter will be added soon.

&nbsp; 
&nbsp; 

# **3. Security View**


This chapter will be added soon.

&nbsp; 
&nbsp; 


# **4. Network View**



This chapter will be added soon.

&nbsp; 
&nbsp; 

# **5. Operations View**

This chapter will be added soon.

&nbsp; 
&nbsp; 

# **6. Runtime View**
This chapter will be added soon.


&nbsp; 
&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
