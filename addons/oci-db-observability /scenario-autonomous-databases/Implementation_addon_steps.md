# STEP2. ORM OBS ADD-ON Deployment Steps <!-- omit from toc -->

Follow these steps:

1. From the Autonomous Databases scenario README, click the ORM deployment button that matches the selected deployment type: GLOBAL or LOCAL. The button opens a new ORM stack with the JSON files for that option preloaded.
2. Accept terms and wait for the configuration to load.
3. Set the working directory to `rms-facade`.
4. Set the stack name you prefer.
5. Set the Terraform version to `1.5.x`. Click Next.
6. ORM will load the required json files.
7. Enable Dependencies Source for URL-Based Configuration to ocibucket option.
8. Create a bucket, upload the output files created with the one-oe deployment and select this bucket.
9. Add the Dependency Files .

<img src="../images/ORM.png" height="300" align="center">

10.  Click Next.
11.  Uncheck run apply. Click Create.
12.  First, execute a plan job to review all the resources that Terraform will create. Once verified, proceed to run the apply job to initiate the deployment.


1.  During the first execution, the add-on will create a dedicated Observability Vault and Key. To grant access to these resources for the grp-lz-mon-admins group in the common One-OE identity domain, we have added the following two statements to the pcy-global-mon-admin policy. Check the IAM file selected for your deployment option.

```
allow group 'id_lz_common'/'grp-lz-mon-admins' to use vaults in compartment cmp-landingzone:cmp-lz-security where target.vault.id='ocid1.vault.oc1.region.xxxx'

allow group 'id_lz_common'/'grp-lz-mon-admins' to use keys in compartment cmp-landingzone:cmp-lz-security where target.key.id='ocid1.key.oc1.region.xxx'
```

>[!NOTE] Be sure to update the OCIDs with your own resource IDs.

11. After making the changes, execute a second plan to review these updates before running the job again.

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
