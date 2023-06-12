# OCI Open LZ Blueprint

Welcome to the **OCI Open LZ**, the **Operating Entities Landing Zone**, a reference blueprint to simplify the onboarding of organizations, business units, and subsidiaries into OCI. 

The purpose of the OCI Open LZ is to:
1. Provide a landing zone design ready to **onboard an enterprise organization** and its functional divisions - identified as **operating entities (OE)** with their teams, departments, and projects.
2. Provide a cloud-native **operating model** to simplify and scale **day 2 operations**.
3. **Enable customers, partners**, and the general **IT community** to **create their own landing zones** with **lower efforts** through a **comprehensive OCI reference architecture**.  
4. Provide **tailoring guidelines** to help adjust the model. This asset can be used directly, tailored, or used as inspiration to create a new one - as it is not a prescribed solution.

This repository is the source of truth for this blueprint where you can find all support materials. In the current version you can find the following elements:

| NAME                                             | TYPE    | DESCRIPTION                                                                                                          |
|--------------------------------------------------|---------|----------------------------------------------------------------------------------------------------------------------|
| [OCI Open LZ Blueprint](/docs/OCI_Open_LZ.pdf)   | PDF     | This artefact presents the OCI Open LZ blueprint design with the functional, security, network, and operations view. |
| [OCI Open LZ Diagrams](/docs/OCI_Open_LZ.drawio) | Draw.io | This artefact presents all the architecture diagrams in a reusable format.                                           |


# Approach Considerations
A landing zone can be set up in different ways and can take different amounts of time to implement. There are mainly two types of approaches:
1.	**Standard and prescribed approaches** are the recommended starting point and can take hours to days to set up. This option enables quick start cloud adoption with a set of recommended best practices with a prescriptive design. For more details on this type of approach, also known as standard landing zones, please refer to the [CIS Landing Zone](https://github.com/oracle-quickstart/oci-cis-landingzone-quickstart)  or [OELZ](https://github.com/oracle-quickstart/oci-landing-zones).
2.	**Advanced or tailored approaches** are more complex and should cover complete security, network, and operational topics, and can onboard a complete enterprise organization with one cloud operating model. This option is recommended when the standard approach is not enough (e.g., large organizations with fine tune security or network requirements, large and heterogeneous workloads landscape with multi-cloud scenarios, etc.) and experience tells us it can take from weeks to four or five months to set up - depending on requirements and team expertise.
      
The **OCI Open LZ** is an example of the outcome of the latter approach, a tailored landing zone, and one of its purposes is to help reduce the design time, associated cost, and effort. 
