# Openshift Extension Cleanup & Routing <!-- omit from toc -->
&nbsp; 

## **1. Summary**

|                      |                                                       |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | Openshift extension cleanup and routing                                    |
| **OBJECTIVE**        | Removing the internet gateway and attch the spoke openshift vcn to the DRG with required route rules |
| **TARGET RESOURCES** | Openshift VCN                                                  |

&nbsp; 

## **2. Post Deployment Activities**


### Step 1

Update the One-OE Landing Zone stack network configuration file to:

- Attach the OpenShift VCN to the DRG
- Add the required route rules for both the DRG and the VCN route tables

> [!NOTE]
> This demonstration is based on the One-OE Hub E model, refer the file  following HUB E network post operation JSON file, edit the One-OE ORM stack and replace with updated file: [oci_open_lz_hub_e_network_post.auto.tfvars.json](./oci_open_lz_hub_e_network_post.auto.tfvars.json).

### Step 2

After completing Step 1, update the OpenShift Extension stack networking configuration to:

- Remove the Internet Gateway
- Convert the public subnet to a private subnet
- Add route rules to send and receive traffic via the Hub through the DRG

> [!NOTE]
> Refer the file  following openshift extension network post operation JSON file, edit the Openshift extension ORM stack and replace with updated file: [oci_openshift_lz_ext_network_post.auto.tfvars.json](./oci_openshift_lz_ext_network_post.auto.tfvars.json).

&nbsp;

######  *After completing the above steps, the OpenShift Landing Zone Extension will be fully configured, connected through the Hub via DRG, and ready for use.*


&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.