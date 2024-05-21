# **The OCI Operating Entities Landing Zone** 

###  The OCI Open LZ - Simplifying the [Onboarding](#) and [Running](#) of OCI

&nbsp; 

<img src="images/oci_open_lz.jpg" width="1200" height="value">

&nbsp; 

Welcome to the **OCI <ins>Op</ins>erating <ins>En</ins>tities Landing Zone**, also known as **OCI Open LZ**, a set of open assets and best practices to simplify the onboarding and running of OCI. 

The objective of the **OCI Open LZ** is to provide:
1. **[A Design Blueprint](/design/readme.md):** A complete SecNetOps landing zone design, ready to onboard an enterprise organization and its functional divisions &ndash; identified as **Op**erating **En**tities (OEs). Note the **OCI Open LZ** is an OCI [**Standard Landing Zones**](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/standard_landing_zones/readme.md) and it can be used directly or as a starting point for a [**Tailored Landing Zone Design**](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/tailored_landing_zones/readme.md).
2. **[An Operating Model](/examples/oci-open-lz/readme.md):** a complete cloud-native / gitops runtime to simplify and scale day two operations, focusing on IaC configurations and not on code.
3. **[Enablement Activities](/examples/oci-learn-lz/readme.md):** to our customers, partners, independent software vendors (ISV), and the general IT community to create, configure, and run OCI landing zones with lower efforts and reduced timeframes.
4. **[A Catalogue of Examples](/examples/readme.md)**: for landing zone variations, related designs, extensions, and IaC configurations.
5. A tangible path to **reduce the design and implementation timelines, associated cost, and efforts**.
   


&nbsp; 

## How to Start

This repository is the source of truth for the OCI Open LZ, where you can find all the materials to **design**, **configure**, and **run**  OCI landing zones. The following activities are proposed as guidance to create your OCI-tailored landing zone.

&nbsp; 


| # | ACTIVITY | ASSETS| DESCRIPTION   | 
|---|---|---|---|
| **1**| **PREPARE** | [5 Steps in 5'](https://www.youtube.com/watch?v=JWKRHfO4LnY&ab_channel=OracleLearning),</br>[A Blueprint to Onboard and Run OCI ](https://www.youtube.com/watch?v=xbKIxSERIxY) | These sessions discusses the differences between [standard](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/standard_landing_zones/standard_landing_zones.md) and [tailored landing zones](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/tailored_landing_zones/tailored_landing_zones.md), presenting the OCI Open LZ Blueprint tailored views and running a demo.
| **2** | **ENABLE** | [OCI Learn LZ](/examples/oci-learn-lz/readme.md)| Use the OCI Learn LZ exercises to understand how to **design** and **configure** OCI Landing Zones. |
| **3** | **DESIGN** | [OCI Open LZ Blueprint](/design/readme.md)  | Use the OCI Open LZ **blueprint** to design your functional, security, network, and operations view, with all the diagrams in a reusable format. Other **landing zone models** are also [available](/design/models/readme.md). |   
| **4** | **CONFIGURE** | [OCI Open LZ Runtime View](/examples/oci-open-lz/readme.md) | Use the  OCI Open LZ runtime  **configurations** as your IaC templates. These configurations are easily adjustable to any other landing zone model and are run with [OCI Open LZ Terraform Orchestrator Module ](orchestrator/readme.md) on top of the [CIS  Landing Zone Enhanced Modules](https://www.ateam-oracle.com/post/cis-landing-zone-enhanced-modules). |                
| **5** | **RUN** | [OCI Landing Zones Orchestrator ](https://github.com/oracle-quickstart/terraform-oci-landing-zones-orchestrator) | Use the **OCI  Landong Zone Orchestrator** to run an operation on several resource types into one consolidated execution. It supports **any OCI landing zone configuration**, including - but not limited to &ndash; the OCI Open LZ. </br>Use the **orchestrator** with your configurations or with the provided [operations examples](/examples/oci-open-lz/readme.md) using **Terraform CLI** or **Oracle Resource Manager (ORM)**.|



&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
