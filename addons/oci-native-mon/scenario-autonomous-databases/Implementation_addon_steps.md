# STEP2. ORM OBS ADD-ON Deployment Steps <!-- omit from toc -->


Go to the orchestrator [github page](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator).

At the beginning of the README page, select 'Deploy to Oracle Cloud'. When you click the provided magic button, a new ORM stack will be created. Follow these steps:

1. Accept terms, wait for the configuration to load.
2. Set the working directory to “rms-facade”.
3. Set the stack name you prefer.
4. Set the terraform version to 1.5.x. Click Next.
5. Create you own bucket and upload the JSON files provided in this asset:

* [oci_open_lz_addon_mon_iam_atp.auto.tfvars.json](oci_open_lz_addon_mon_iam_atp.auto.tfvars.json)
* [oci_open_lz_addon_mon_network_atp.auto.tfvars.json](oci_open_lz_addon_mon_network_atp.auto.tfvars.json)

6. Add the files generated as output in the ONE-OE deployment as dependencies.
7. Un-check run apply. Click Create.
8. First, execute a plan job to review all the resources that Terraform will create. Once verified, proceed to run the apply job to initiate the deployment.

9. During the first execution, the add-on will create a dedicated Observability Vault and Key. To grant access to these resources for the grp-lzp-mon-admins group, add the following two statements to the pcy-global-mon-admin policy by updating the file:
[oci_open_lz_addon_mon_iam.auto.tfvars.json](oci_open_lz_addon_mon_iam.auto.tfvars.json)

```
Allow group grp-lzp-mon-admins to use vaults in compartment cmp-landingzone-p:cmp-lzp-security where target.vault.id='ocid1.vault.oc1.region.xxxx'

Allow group grp-lzp-mon-admins to use keys in compartment cmp-landingzone-p:cmp-lzp-security where target.key.id='ocid1.key.oc1.region.xxx'
```

> [!NOTE] Be sure to update the OCIDs with your own resource IDs.

1.  After making the changes, execute a second plan to review these updates before running the job again.

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE) for more details.
