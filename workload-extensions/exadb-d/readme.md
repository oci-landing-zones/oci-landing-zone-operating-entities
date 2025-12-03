# **[ExaDB-D Landing Zone Extension](#)**   <!-- omit from toc -->
## **An OCI Open LZ [Workload Extensions](#) to Reduce Your Time-to-Production** <!-- omit from toc -->

 <img src="../../commons/images/icon_exadb-d.jpg" height="100">
&nbsp; 

## **1. Introduction**
Welcome to the  **Exadata Database Service On Dedicated Infrastructure (ExaDB-D) Landing Zone Extension**.

The Exadata Database Service On Dedicated Infrastructure (ExaDB-D) Landing Zone Extension is a secure cloud environment, designed with the best practices to simplify the on-boarding of [Exadata Database Service on Dedicated Infrastructure workloads](https://docs.oracle.com/en/engineered-systems/exadata-cloud-service/index.html) and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.
&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe) Blueprint as the reference Landing Zone and guides the deployment of ExaDB-D on top of it. You could use this extension also in the other Operating Entities blueprints, as the [Multi-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/multi-oe) or the [Multi-Tenancy](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/multi-tenancy) Blueprints.

A Workload extension satisfies the requirements to deploy a specific, complex workload, providing design guidelines about where to deploy the workload in a pre-existing baseline Landing Zone.

&nbsp;

## **3. Deployment**

These are the required steps to provision the ExaDB-D landing zone extension:

 1. It's required to already have deployed an OCI Landing Zone. In this guide we will build on top of the [One-OE](https://github.com/oci-landing-zones/terraform-oci-open-lz/tree/master/blueprints/one-oe) Landing Zone.
 2. **Deploy** the Landing Zone ExaDB-D requirements with the [**Step 1 - ExaDB-D Extension**](1_exadb-d_extension/) guide.
 3. **Use** the **ExaDB-D Use Cases** to guide your deployment following [**Step 2 - ExaDB-D Use Cases**](2_exadb-d_use_cases/).

&nbsp;

## License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
