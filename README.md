# OCI Open LZ Blueprint

Welcome to the **OCI Open LZ**, the **Operating Entities Landing Zone**, a reference blueprint to simplify the onboarding of organizations, business units, and subsidiaries into OCI. 

The purpose of the **OCI Open LZ** is to:
1. Provide a landing zone design ready to **onboard an enterprise organization** and its functional divisions - identified as **operating entities (OE)** with their teams, departments, and projects.
2. Provide a cloud-native **operating model** to simplify and scale **day 2 operations**.
3. **Enable customers, partners**, and the general **IT community** to **create their tailored landing zones** with **lower efforts** through a **comprehensive OCI reference architecture**.  
4. Provide **tailoring guidelines** to help adjust the model. This asset can be used directly, tailored, or used as inspiration to create a new one - as it is not a prescribed solution.

This repository is the source of truth for this blueprint where you can find all support materials associated with the phase where they should be used. In the current version you can find the following elements:

| PHASE              | NAME                                                                                                                   | FORMAT   | DESCRIPTION                                                                                                          |
|--------------------|------------------------------------------------------------------------------------------------------------------------|----------|----------------------------------------------------------------------------------------------------------------------|
| Enablement         | [5 Steps to Onboard and Run OCI](https://www.youtube.com/watch?v=JWKRHfO4LnY&ab_channel=OracleLearning)                | Video    | Start here for an 5 minute overview of the key steps to onboard and run OCI with the Open LZ.                        |
| Enablement, Design | [OCI Open LZ Blueprint](/docs/OCI_Open_LZ.pdf)                                                                         | PDF      | This artefact presents the OCI Open LZ blueprint design with the functional, security, network, and operations view. |
| Design             | [OCI Open LZ Diagrams](/docs/OCI_Open_LZ.drawio)                                                                       | Draw.io  | This artefact contains all the architecture diagrams in a reusable format.                                           |
| Run                | [Managing Shared Services Examples](r/examples/landing-zones/open-landing-zone/operation-entity-infrastructure/open-lz-oe-02-vision/Readme.md)                                                                                  | JSON/HCL | Supports Operation Scenario configuration 'OP.01 Manage Shared Services.'                                            |
| Run                | [Managing OEs Examples](/examples/landing-zones/open-landing-zone/operation-entity-infrastructure/open-lz-oe-01-vision) | JSON/HCL | Supports Operation Scenario configuration 'OP.02 Manage OE'.                                                         |
| Run                | [OCI CIS LZ IAM Repository](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam)                   | Git      | CIS LZ Terraform modules for Identity and Access Management to support runtime operations examples.                  |
| Run                | [OCI CIS LZ Network Repository](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking)        | Git      | CIS LZ Terraform modules for Network resources to support runtime operations examples.                               |


# Approach Considerations
A landing zone can be set up in different ways and can take different amounts of time to implement. There are mainly two types of approaches:
1.	**Standard and prescribed approaches** are the recommended starting point and can take hours to days to set up. This option enables quick start cloud adoption with a set of recommended best practices with a prescriptive design. For more details on this type of approach, also known as standard landing zones, please refer to the [CIS Landing Zone](https://github.com/oracle-quickstart/oci-cis-landingzone-quickstart)  or [OELZ](https://github.com/oracle-quickstart/oci-landing-zones).
2.	**Advanced or tailored approaches** are more complex and should cover complete security, network, and operational topics, and can onboard a complete enterprise organization with one cloud operating model. This option is recommended when the standard approach is not enough (e.g., large organizations with fine tune security or network requirements, large and heterogeneous workloads landscape with multi-cloud scenarios, etc.) and experience tells us it can take from weeks to four or five months to set up - depending on requirements and team expertise.
      
The **OCI Open LZ** is an example of the outcome of the latter approach, a tailored landing zone, and one of its purposes is to help reduce the design time, associated cost, and effort. 
