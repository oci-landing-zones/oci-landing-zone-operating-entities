# **[OCVS Landing Zone Extension](#)**   <!-- omit from toc -->
## **An OCI Open LZ [Workload Extensions](#) to Reduce Your Time-to-Production**  <!-- omit from toc -->

 <img src="../../commons/images/icon_ocvs.jpg" height="50">

&nbsp; 

## **1. Introduction**
Welcome to the **OCVS Landing Zone Extension**.

The OCVS Landing Zone (LZ) Extension is a secure cloud environment, designed with best practices to simplify the onboarding of OCVS workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone **configuration**.

&nbsp; 

## **2. Design Overview**

This workload extension uses the [One-OE](/blueprints/one-oe/readme.md) Blueprint as the reference Landing Zone and guides the deployment of OCVS on top of it.


<video autoplay muted loop controls src="https://github.com/user-attachments/assets/fe404302-91a3-4b51-99a6-25a7727feeef"></video>
<video autoplay muted loop controls src="https://fr3elochwkkt.objectstorage.eu-frankfurt-1.oci.customer-oci.com/p/e58EGQJxBZV5CdmvRBr6sDyy2h3hZDJ7zZcUi3aBojdgM-AdS1NOhO7WbqIjGpbw/n/fr3elochwkkt/b/bucket-20240805-1323/o/ocvs.mp4"></video>


&nbsp;

## **3. Deployment**                              

There are  **four deployment steps** to provision OCVS landing zone extension: 
1. The [**One-OE LZ**](../../blueprints/one-oe/) is a **requirement** and needs to be deployed before continuing.
2. Deploy **foundations infrastructure**. Follow the guide in [Step 1](1_foundations/README.md)
3. Create **Software Defined Data Center** (SDDC) in [Step 2](2_ocvs/README.md)
4.  Optionally create Load Balancer (LB) Subnet in [Step 3](3_lb_optional/README.md)


&nbsp; 
# License <!-- omit from toc -->

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
