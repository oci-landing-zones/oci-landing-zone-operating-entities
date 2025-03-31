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

# TODO:
## Integration:
Terraform module expects to be passed:
- VCN ID
- Subnet ID for provisioning subnet
- Internal route table used for provisioning subnet
- VLAN route table
- NSG IDs



## Network:
- Terraform creates VLANs as not supported by orchestrator

## NSGs:
- Simple: Ingress from all internal ranges, Egress to internet
- Advanced: 50 NSG groups


## **2. OCVS Deployment**
1. Navigate to [Software-Defined Data Centers](https://cloud.oracle.com/vmware/sddcs/create) as part of VMWare service in OCI. 
2. Choose a suitable name and as a compartment select *cmp-p-platform-ocvs-sddc*, upload public SSH key.
3. On the next page, we define clusters. We start by defining a new cluster.
4. Hosts specification according to your requirements.
5. On next tab as a VCN choose *vcn-fra-p-ocvs* in the *cmp-p-network* compartment.
6. Select create new subnet and VLANs.
7. Provide desired CIDR range for the Cluster Network
8. Review and finish the set-up

You can now continue with optional LB network deployment in [Step 3](./../3_lb_optional)

Post OP update route for NSX Edge
resource "null_resource" "internal_route_table_update" {
  triggers = {
    rt_id                 = var.internal_rt_id
    cidr                  = var.workload_network_cidr
    nsx_edge_uplink_ip_id = oci_ocvp_sddc.dr_sddc[0].nsx_edge_uplink_ip_id
  }

  provisioner "local-exec" {
    command = "ortu --rt-ocid ${self.triggers.rt_id} --cidr ${self.triggers.cidr} --ne-ocid ${self.triggers.nsx_edge_uplink_ip_id}"
  }
  provisioner "local-exec" {
    when    = destroy
    command = "ortu delete --rt-ocid ${self.triggers.rt_id} --cidr ${self.triggers.cidr} --ne-ocid ${self.triggers.nsx_edge_uplink_ip_id}"
  }
  count = var.sddc_network_enabled && var.sddc_enabled ? 1 : 0
}
&nbsp; 
&nbsp; 

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
