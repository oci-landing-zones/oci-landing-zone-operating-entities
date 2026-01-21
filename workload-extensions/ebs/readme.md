
# **[EBS Landing Zone Extension](#)**
## **An OCI Open LZ [Workload Extensions](#) to Reduce Your Time-to-Production**
 <img src="../../commons/images/icon_ebs.jpg" height="70">

&nbsp; 

## **1. Introduction**
Welcome to the **EBS Landing Zone Extension**.

The EBS Landing Zone Extension is a secure cloud environment, designed with best practices to simplify the on-boarding of E-Business Suite workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.
&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](https://github.com/oci-landing-zones/terraform-oci-open-lz/tree/master/blueprints/one-oe) Blueprint as the reference Landing Zone and guides the deployment of EBS Cloud Manager on top of it.

> [!NOTE]
> The previous version of the EBS Landing Zone Extension designed as an extension to the CIS landing zone has been archived [here](0_archive)

&nbsp;

## **3. Deployment**

These are the required steps to provision the EBS landing zone extension:

 1. It's required to already have deployed an OCI Landing Zone. In this guide we will build on top of the One-OE LZ with Hub model A Light option. Any other OCI landing zone, such as a [CIS landing zone](https://github.com/oci-landing-zones/oci-cis-landingzone-quickstart), [OCI Core Landing Zone](https://github.com/oci-landing-zones/terraform-oci-core-landingzone) or [Multi-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-oe/generic_v1/runtime), can also used as a baseline landing zone as well.
 2. Deploy the base infrastructure from the [Step 1 - EBS Extension](1_ebs_extension/)
 3. Deploy **EBS Cloud Manager** in [Step 2 - EBS Cloud Manager](2_ebscm/)

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.