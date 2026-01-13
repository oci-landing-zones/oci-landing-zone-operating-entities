# ORM Secure Desktops Landing Zone Extension Deployment Steps <!-- omit from toc -->


Go to the orchestrator [GitHub page](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).

At the beginning of the README page, select 'Deploy to Oracle Cloud'. When you click the provided magic button, a new ORM stack will be created. Follow these steps:

1. Accept terms, wait for the configuration to load.
2. Set the working directory to “rms-facade”.
3. Set the stack name you prefer.
4. Set the terraform version to 1.5.x. Click Next.
5. Create your own bucket/GitHub repo and upload the JSON files provided in this asset:

[oci_sd_lz_addon_iam.auto.tfvars.json](oci_sd_lz_addon_iam.auto.tfvars.json)

The IAM JSON files define the creation of the following resources:
* **cmp-lzp-platform-sd**: Compartment for Secure Desktops.
* **grp-lzp-secure-desktop-admin**: IAM group for Secure Desktop administrators.
* **grp-lzp-secure-desktop-users**: IAM group for Secure Desktop users.
* **dg-lzp-sd**: Dynamic group required for Secure Desktop access.
* **pcy-secure-desktop-dg**: IAM policy for the dynamic group.
* **pcy-secure-desktop-admin-and-users**: IAM policy for both admin and user groups.
  
[oci_sd_lz_addon_priv_network.auto.tfvars.json](oci_sd_lz_addon_priv_network.auto.tfvars.json)

The Network JSON files define the creation of the following resources:
* **dns_resolver** with forwarding rules and **dns_forwarder**
* **vcn-fra-lzp-sd** Virtual Cloud Network for SD
* **nsg-lzp-sd-dns**  Network Security Group to allow communication from DNS endpoints in the HUB
* **nsg-fra-lzp-hub-pe-sd**: NSG for the private endpoint (SD)
* **sn-fra-sd-desktops** and **sn-fra-sd-infra**: SD and INFRA subnets
* **rt-01-lzp-sd-vcn-gen**: Route Table for the SD VCN
* **sl-lzp-sd-generic**:  Secure List
* **drgatt-fra-lzp-sd-vcn**: Dynamic Routing Gateway attachment for the SD VCN
* **sgw-fra-sd**: Service Gateway
  
6. Add the files generated as output in the ONE-OE deployment as dependencies.
7. Un-check run apply. Click Create.
8. First, execute a plan job to review all the resources that Terraform will create. Once verified, proceed to run the apply job to initiate the deployment.


# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.
