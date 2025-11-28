# **[OpenShift Landing Zone Extension](#)**   <!-- omit from toc -->
## **An OCI Operating Entities LZ [Workload Extensions](#) to Reduce Your Time-to-Production**  <!-- omit from toc -->

 <img src="contents/icon_openshift.png" height="100">

## **1. Introduction**
Welcome to the **OpenShift Landing Zone Extension**.

The OpenShift Landing Zone Extension is a secure cloud environment, designed with best practices to simplify the on-boarding of OpenShift workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.
&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe) Blueprint as the reference Landing Zone and guides the deployment of OpenShift on top of it.
&nbsp;

## **3. Deployment**

These are the required steps to provision the OpenShift workload:

 1. It's required to already have deployed OCI Landing Zone. In this guide we will build on top of the [One-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe) Landing Zone with [Hub model E](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/openshift/addons/oci-hub-models/hub_e) option. Any other OCI landing zone, such as [OCI Core Landing Zone](https://github.com/oci-landing-zones/terraform-oci-core-landingzone) or [Multi-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-oe/generic_v1/runtime), can also used as a baseline landing zone as well.
 2. Deploy the base infrastructure from the [Step 1 - OpenShift Extension](1_openshift_extension) guide.
 3. Create OpenShift cluster in [Step 2 - OpenShift cluster creation](2_openshift_installation/).
 4. Post setup cleaning and routing [Step 3 - Openshift extension cleanup and routing](3_openshift_ext_cleanup_and_routing/).




## License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.