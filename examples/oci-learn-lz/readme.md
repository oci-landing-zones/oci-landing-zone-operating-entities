# OCI Learn Landing Zone  

## **Table of Contents**

[1. Objective](#1-objective)</br>
[2. Functional View](#2-functional-view)</br>
[3. Exercises](#3-exercises)</br>

&nbsp; 

## 1. Objective 

Welcome to the **Open Learn Landing Zone**. 

The main objective of this artifact is to provide autonomy to **design** a landing zone using draw.io, and **configure** the related IaC resources and **run** them with ORM.

&nbsp; 

## 2. Functional View 


The OCI Learn LZ has the following characteristics:

1. OCI Landing Zone resources are organized by: Application Functional Domains (Layers), Environments, Projects, and Project Layers
2. Landing Zone scales by: Domains and Projects, Environments, and Project layers have always the same number.
3. There is a Central IT  that controls the common elements of the landing zone. **You are part of this team**.
4. There are several Project Teams, that control their resources. Projects in this exercise are out of scope.
5. Projects will share domain-specific network elements (VCNs) and have dedicated elements, such as Subnets and NSGs. NSGs are handled by Project Teams. Project elements are out of scope.
6. This Landing Zone Model is suitable to aggregate workloads by domain, enterprise-wide. Examples of application domains are Channels, Integrations, Core Systems, etc.
7. The operating model used to provision and change resources is through **versioned IaC configurations** in git repositories. **ORM** will be used to create stacks that aggregate those configurations and run Terraform plan/apply commands.

&nbsp; 


Please review the above characteristics in the diagram below, which presents the key functional elements of the landing zone, in an entity relationship diagram (ERD) format. It also presents ORM and the Control Version System to version the IaC configurations, used by each of the responsible teams. Remember, you are part of the Central IT Team.

&nbsp; 


<img src="diagrams/oci_learn_lz-fun-erd.jpg" alt= “” width="1200" height="value">

&nbsp; 

If we can compare Landing Zones to airports: The OCI Learn LZ is an airport with different types of terminals (domains) that can be - but don't have to be - operated independently at any time by different teams. Each terminal can have a different security posture (domestic, international, etc.), teams, and resources.

&nbsp; 

## 3. Exercises 

There are two exercises in the OCI Learn LZ, one for security elements, where you will create the tenancy structure, and one for the network elements, where you will create a shared hub and domain-related elements, that will be shared with projects.

&nbsp; 

| EXERCISE | OBJECTIVE  | RUN IT |  
|---|---|---|
| #1 - Security | Create the OCI Learn LZ Tenancy Structure | [Here](/examples/oci-learn-lz/exercise1/readme.md)|
| #2 - Network | Create the OCI Learn LZ Network Structure | [Here](/examples/oci-learn-lz/exercise2/readme.md)||