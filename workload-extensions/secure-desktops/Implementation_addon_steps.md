# ORM Secure Desktops Landing Zone Extension Deployment Steps <!-- omit from toc -->


Go to the orchestrator [github page](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).

At the beginning of the README page, select 'Deploy to Oracle Cloud'. When you click the provided magic button, a new ORM stack will be created. Follow these steps:

1. Accept terms, wait for the configuration to load.
2. Set the working directory to “rms-facade”.
3. Set the stack name you prefer.
4. Set the terraform version to 1.5.x. Click Next.
5. Create you own bucket/github repo and upload the JSON files provided in this asset:

* [oci_sd_lz_addon_iam.auto.tfvars.json](oci_sd_lz_addon_iam.auto.tfvars.json)

  Select between these to files, 'pub' for scenario 1 and 'priv' for scenario 2.

* [oci_sd_lz_addon_priv_network.auto.tfvars.json](oci_sd_lz_addon_priv_network.auto.tfvars.json)
* [oci_sd_lz_addon_pub_network.auto.tfvars.json](oci_sd_lz_addon_pub_network.auto.tfvars.json)

1. Add the files generated as output in the ONE-OE deployment as dependencies.
2. Un-check run apply. Click Create.
3. First, execute a plan job to review all the resources that Terraform will create. Once verified, proceed to run the apply job to initiate the deployment.


# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.
