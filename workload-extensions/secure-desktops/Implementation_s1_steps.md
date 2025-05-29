# ORM Secure Desktops Landing Zone Extension Deployment Steps <!-- omit from toc -->


Go to the orchestrator [github page](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).

At the beginning of the README page, select 'Deploy to Oracle Cloud'. When you click the provided magic button, a new ORM stack will be created. Follow these steps:

1. Accept terms, wait for the configuration to load.
2. Set the working directory to “rms-facade”.
3. Set the stack name you prefer.
4. Set the terraform version to 1.5.x. Click Next.
5. Create you own bucket/github repo and upload the JSON files provided in this asset:

* [oci_sd_lz_addon_iam.auto.tfvars.json](oci_sd_lz_addon_iam.auto.tfvars.json)
  cmp-lzp-platform-sd- > compartment for secure desktops.
  grp-lzp-secure-desktop-admin-> group for admin sd
  grp-lzp-secure-desktop-users-g roup for users sd
  dg-lzp-sd-> dynamic groups required for sd
  pcy-secure-desktop-dg-> policy for dg
  pcy-secure-desktop-admin-and-users-> policy for sd groups

* [oci_sd_lz_addon_pub_network.auto.tfvars.json](oci_sd_lz_addon_pub_network.auto.tfvars.json)
* The Network JSON files define the creation of the following resources:
* **vcn-fra-lzp-sd** Virtual Cloud Network for SD
* **nsg-lzp-sd-dns**  Network Security Group to allow communication from DNS endpoints in the HUB
* **nsg-fra-lzp-hub-pe-sd**: NSG for the private endpoint (SD)
* **sn-fra-sd-desktops** and **sn-fra-sd-infra**:SD and INFRA subnets
* **rt-01-lzp-sd-vcn-gen**: Route Table for the SD VCN
* **sl-lzp-sd-generic**:  Secure List
* **drgatt-fra-lzp-sd-vcn**: Dynamic Routing Gateway attachment for the SD VCN
* **sgw-fra-sd**: Service Gateway

1. Add the files generated as output in the ONE-OE deployment as dependencies.
2. Un-check run apply. Click Create.
3. First, execute a plan job to review all the resources that Terraform will create. Once verified, proceed to run the apply job to initiate the deployment.


# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.
