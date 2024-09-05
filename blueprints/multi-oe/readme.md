# **The OCI Open LZ &ndash; [Multi-OE Blueprint](#)**

### Simplifying the Onboarding of Organizations, Business Units, and Subsidiaries into OCI

&nbsp; 

Welcome to the **OCI Open LZ Multi-OE Blueprint**. 

This blueprint helps onboards **several** **Operating Entities (OE)** with shared services and dedicated **environments**, **platforms**, and **projects** for each OE, in **one tenancy**. 

There are two models available:
1. **Generic Model**: It fits any organizational scope, with several Organization Units - such as LoBs, OpCos, Departments, Products, Brands, or Partners - in one tenancy. It can be used directly or tailored. **Note this model will be updated to version 2 soon**, matching the [One-OE](/blueprints/one-oe/runtime/) and [Multi-Tenancy Blueprint](/blueprints/multi-tenancy/readme.md) elements, with the same design and IaC building blocks such as Landing Zone Environment and Platforms. Reach out to review the new model before its published. 
   
2. **SaaS Model**: Is designed for SaaS vendors and managed service providers to onboard OCI in a streamlined manner, with a Pod model set up so that each customer gets a copy or application stack.  This pattern can be seen in SaaS and managed services industries where each customer's environment is independent of another, and the only parts shared are the management plane. This model can be seen as an example of tailoring the generic model and extending the OCI Core Landing Zone with further capabilities.

&nbsp; 

Find below the guides to your design and deployment activities.

&nbsp;

| # | Description | Format   | Generic</br>Model&nbsp;v1 | Generic</br>Model&nbsp;v2 | SaaS </br>Model
|---|---|:-:|:-:|:-:|:-:|
| 1 | High-level Design - MD | <img src="../../commons/images/icon_md.jpg" width="45">  |  [Available](/blueprints/multi-oe/generic_v1/design/readme.md) | *Available Soon* | [Available](/blueprints/multi-oe/saas/design/readme.md)
| 2 | High-level Design - Drawio | <img src="../../commons/images/icon_drawio.jpg" width="30"> | [Available](/blueprints/multi-oe/generic_v1/design/OCI_Open_LZ_Multi-OE-Blueprint.drawio) | [Available](/blueprints/multi-oe/generic_v2/design/OCI_Open_LZ_Multi-OE-Blueprint.drawio) | [Available](/blueprints/multi-oe/saas/design/OCI_Open_LZ_Multi-OE_SaaS_Blueprint.drawio) |
| 3 | High-level Design - PDF | <img src="../../commons/images/icon_pdf.jpg" width="30"> | [Available](/blueprints/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf) | -- | --
| 4 |  Multi-stack Deployment for Distributed Declarative IaC Operations - Terraform + JSON | <img src="../../commons/images/icon_terraform.jpg" width="32"><img src="../../commons/images/icon_json.jpg" width="30"> | [Available](/blueprints/multi-oe/generic_v1/runtime/readme.md) | *Available Soon* | [Available](/blueprints/multi-oe/saas/runtime/readme.md)



&nbsp; 



&nbsp; 

&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
