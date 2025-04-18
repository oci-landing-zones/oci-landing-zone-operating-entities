# OCVS Service Set-up <!-- omit from toc -->
## **Table of Contents** <!-- omit from toc -->
- [**1. Summary**](#1-summary)
- [**2. OCVS Deployment**](#2-ocvs-deployment)

&nbsp; 

## **1. Summary**

|                      |                                                       |
| -------------------- | ----------------------------------------------------- |
| **NAME**             | OCVS services Set-up                                  |
| **OBJECTIVE**        | Provision OCI OCVS on top of Landing Zone Extensions. |
| **TARGET RESOURCES** | OCVS Software Defined Data Center (SDDC)              |

&nbsp; 

## **2. OCVS Deployment**
1. Navigate to [Software-Defined Data Centers](https://cloud.oracle.com/vmware/sddcs/create) as part of VMWare service in OCI. 
2. Choose a suitable name and as a compartment select *cmp-p-platform-ocvs-sddc*, upload public SSH key.
3. On the next page, we define clusters. We start by defining a new cluster.
4. Hosts specification according to your requirements.
5. On next tab as a VCN choose *vcn-fra-p-ocvs* in the *cmp-p-netowrk* compartment.
6. Select create new subnet and VLANs.
7. Provide desired CIDR range for the Cluster Network
8. Review and finish the set-up

You can now continue with optional LB network deployment in [Step 3](./../3_lb_optional)

&nbsp; 
&nbsp; 

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
