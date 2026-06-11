# STEP2. ORM OBS ADD-ON Deployment Steps <!-- omit from toc -->

Follow these steps:

1. From the Autonomous Databases scenario README, click the ORM deployment button that matches the selected deployment type: GLOBAL or LOCAL. The button opens a new ORM stack with the JSON files for that option preloaded.
2. Accept terms and wait for the configuration to load.
3. Set the working directory to `rms-facade`.
4. Set the stack name you prefer.
5. Set the Terraform version to `1.5.x`. Click Next.
6. Confirm that the selected deployment loaded the expected JSON files:

GLOBAL deployment:

* [addon_obs_iam_atp_global.json](addon_obs_iam_atp_global.json)
* [addon_obs_network_atp_global.json](addon_obs_network_atp_global.json)
* [addon_obs_security_atp.json](addon_obs_security_atp.json)
* [addon_obs_instance_atp.json](addon_obs_instance_atp.json)

LOCAL deployment:

* [addon_obs_iam_atp_local.json](addon_obs_iam_atp_local.json)
* [addon_obs_network_atp_local.json](addon_obs_network_atp_local.json)
* [addon_obs_security_atp.json](addon_obs_security_atp.json)
* [addon_obs_instance_atp.json](addon_obs_instance_atp.json)

7. Add the files generated as output in the One-OE deployment as dependencies.
8. Uncheck run apply. Click Create.
9. First, execute a plan job to review all the resources that Terraform will create. Once verified, proceed to run the apply job to initiate the deployment.

10. During the first execution, the add-on will create a dedicated Observability Vault and Key. To grant access to these resources for the grp-lz-mon-admins group in the common One-OE identity domain, we have added the following two statements to the pcy-global-mon-admin policy. Check the IAM file selected for your deployment option.

```
allow group 'id_lz_common'/'grp-lz-mon-admins' to use vaults in compartment cmp-landingzone:cmp-lz-security where target.vault.id='ocid1.vault.oc1.region.xxxx'

allow group 'id_lz_common'/'grp-lz-mon-admins' to use keys in compartment cmp-landingzone:cmp-lz-security where target.key.id='ocid1.key.oc1.region.xxx'
```

>[!NOTE] Be sure to update the OCIDs with your own resource IDs.

11. After making the changes, execute a second plan to review these updates before running the job again.

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
