# OCI Open LZ Blueprint


<img src="oci_open_lz.png" alt= “” width="1200" height="value">

&nbsp; 

Welcome to the **OCI Open LZ**, the **Op**erating **En**tities **L**anding **Z**one, a reference **blueprint** to simplify the onboarding of organizations, business units, and subsidiaries into OCI. 

The purpose of the **OCI Open LZ** is to:
1. Provide a landing zone design ready to **onboard an enterprise organization** and its functional divisions - identified as **operating entities (OE)** with their teams, departments, and projects.
2. Provide a cloud-native **operating model** to simplify and scale **day 2 operations**.
3. **Enable customers, partners**, and the general **IT community** to **create their tailored landing zones** with **lower efforts** through a **comprehensive OCI reference architecture**.  
4. Provide **tailoring guidelines** to help adjust the model. This asset can be used directly, tailored, or used as inspiration to create a new one - as it is not a prescribed solution.

This repository is the source of truth for this blueprint where you can find all support materials associated with the phase where they should be used. In the current version you can find the following elements:

&nbsp; 

| PHASE              | NAME                                                                                                                   | FORMAT   | DESCRIPTION                                                                                                          |
|--------------------|------------------------------------------------------------------------------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------|
| Enablement         | [5 Steps to Onboard and Run OCI](https://www.youtube.com/watch?v=JWKRHfO4LnY&ab_channel=OracleLearning)                | Video    |    Start here for a 5-minute overview of the key steps to onboard and run OCI with the Open LZ.                        |
| Enablement         | [A Landing Zone Blueprint to Onboard and Run OCI](https://www.youtube.com/watch?v=xbKIxSERIxY)                | Video    | This recorded session discusses the differences between standard and tailored landing zones, presents the OCI Open LZ Blueprint views, and finishes with a demo of running OCI with Terraform configurable modules.                        |
| Enablement, Design | [OCI Open LZ Blueprint](/docs/OCI_Open_LZ.pdf)                                                                         | PDF      | This artifact presents the OCI Open LZ blueprint design with the functional, security, network, and operations view. |
| Design             | [OCI Open LZ Diagrams](/docs/OCI_Open_LZ.drawio)                                                                       | Draw.io  | This artifact contains all the architecture diagrams in a reusable format.                                           |
| Run                | [Managing Shared Services Examples](/examples/landing-zones/open-landing-zone/operation-entity-infrastructure/open-lz-oe-02-vision/Readme.md)                                                                                  | JSON/HCL | Supports Operation Scenario configuration 'OP.01 Manage Shared Services.'                                            |
| Run                | [Managing OEs Examples](/examples/landing-zones/open-landing-zone/operation-entity-infrastructure/open-lz-oe-01-vision) | JSON/HCL | Supports Operation Scenario configuration 'OP.02 Manage OE'.                                                         |
| Run                | [OCI CIS LZ IAM Repository](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam)                   | Git      | CIS LZ Terraform modules for Identity and Access Management to support runtime operations examples.                  |
| Run                | [OCI CIS LZ Network Repository](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking)        | Git      | CIS LZ Terraform modules for Network resources to support runtime operations examples.                               |

&nbsp; 

# Approach Considerations
A landing zone can be set up in different ways and can take different amounts of time to implement. There are mainly two types of approaches:
1.	[**Standard and prescribed approaches**](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/standard_landing_zones/standard_landing_zones.md) are the recommended starting point and can take hours to days to set up. This option enables quick start cloud adoption with a set of recommended best practices with a prescriptive design. For more details on this type of approach, also known as standard landing zones, please refer to the [CIS Landing Zone](https://github.com/oracle-quickstart/oci-cis-landingzone-quickstart)  or [OELZ](https://github.com/oracle-quickstart/oci-landing-zones).
2.	[**Tailored approaches**](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/tailored_landing_zones/tailored_landing_zones.md) focuses on creating a landing that fits completely your requirements. They normally cover security, network, and operational topics, and can onboard a complete enterprise organization with one cloud operating model. This option is recommended when the standard approach is not enough (e.g., large organizations with fine-tuned security or network requirements, large and heterogeneous workloads landscape with multi-cloud scenarios, etc.) and experience tells us it can take from weeks to some months to set up - depending on requirements and team expertise.
      
The **OCI Open LZ** is an example of the outcome of the latter approach, a tailored landing zone, and one of its purposes is to help reduce the design time, associated cost, and effort. 

For more details on other approaches and assets please refer to **[Oracle Landing Zones](https://github.com/oracle-devrel/technology-engineering/blob/main/landing-zones/README.md)**.

&nbsp; 

# License

Copyright (c) 2023 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.