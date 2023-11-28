# **OCI Open LZ Runtime View**

**Table of Contents**

[1. Introduction](#1-introduction)</br>
[2. Operational Segregation](#2-segregating-operational-responsibilities)</br>
[3. Central Operations Team](#3-central-operations-team---operations-scenarios)</br>
[4. OE Operations Teams](#4-oe-operations-teams---operations-scenarios)</br>

&nbsp; 

## 1. Introduction

This section presents **OCI Open LZ Runtime View**, i.e., the **day two execution** of the operations scenarios introduced in [OCI Open LZ Operations View](../../design/OCI_Open_LZ.pdf).

&nbsp; 

## 2. Segregating Operational Responsibilities

The **operations scenarios** are one of the most important elements of this blueprint, as they represent the use cases and its key activities on the OCI Open LZ that create or update resources. 

An operation scenario is normally triggered by a service request, on a ticketing system. In a more formal definition, it should be seen as an operational process, which is a set of correlated activities executed as one unit of work, with its own frequency. The owner of each scenario will be the cloud operations team which has associated OCI Groups and Policies that allow the management of those resources. 

Note the distribution of operations between cloud operations teams is a design topic on the OCI Open LZ Operations View. 

&nbsp; 

## 3. Central Operations Team - Operations Scenarios

Per OCI Open LZ Design, this team is responsible for managing the landing zone share resources and OEs network resources, and can execute the following operations:

- [**OP.01 – Manage Shared Services:**](/examples/oci-open-lz/op01_manage_shared_services/readme.md) Creates or changes the shared elements of the landing zone and applies posture management.
- [**OP.02 – Manage OE:**](/examples/oci-open-lz/op02_manage_oes/oe01/readme.md) Onboards or changes an OE, creating the OE structures that will be used by the OE to create resources.
  
Each scenario has its **runtime configurations** ready for execution with **Terraform CLI** or **Oracle Resource Manager** (ORM).

&nbsp; 

## 4. OE Operations Teams - Operations Scenarios

Per OCI Open LZ Design, these teams, one per OE, are responsible for managing the OE resources such as projects and PoC, and can execute the following operations:

- [**OP.03 – Manage Department:**](/examples/oci-open-lz/op03_manage_department/readme.md) Creates and changes a new department structure to receive department projects.
- [**OP.04 - Manage Project Environment:**](/examples/oci-open-lz/op04_manage_projects/readme.md) Creates or changes a project with the related environments and application layers.
- **OP.05 – Manage PoC Project:** Creates or changes a PoC project in the OE Sandbox environment.

Each scenario has its **runtime configurations** ready for execution with **Terraform CLI** or **Oracle Resource Manager** (ORM).