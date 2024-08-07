# POST.OP.01.04 – Update IAM Policies to allow OE Project Teams to access shared resources

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. Setup IAM Configuration](#2-iam-configuration-changes)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.01.04 |
| **OP. NAME** | Update IAM Policies to allow OE Project Teams to access shared resources | 
| **OBJECTIVE** | Grant access to OE Project Teams to access to some global shared resources. |
| **TARGET RESOURCES** | - **Security**: Policies. |
| **IAM CONFIG**| [open_lz_oe_01_identity.auto.tfvars.json](../final_configs_after_postops/open_lz_shared_network.auto.tfvars.json)|
| **TERRAFORM MODULES**| [CIS Landing Zone IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Multi-OE Design document](/blueprints/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf).|
| **PRE-ACTIVITIES** | [OP.04 Manage Projects](../../op04_manage_projects/readme.md) executed. Specifict OE Project Team IAM Groups created. |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [<img src="../../../../../commons/images/DeployToOCI.svg"  height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “rms-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.2.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.01](../readme.md). |

&nbsp; 

## **2. IAM Configuration Changes**

With the execution of [OP.04 Manage Projects](../../op04_manage_projects/readme.md), the IAM groups for specific project and layer teams are created, like the ones referenced in the Open LZ design (GRP.OE.03 & GRP.OE.04). These groups manages resources for OE01, Prod environment, Department A, Project 1, application or DB layers.

These groups needs to get access to some shared elements, like the Shared Security resources.

We'll create a new policy for all the grops that need access to the same shared resources. Replace the *'OCID-COMPARTMENT-ROOT'* with the OCID of your tenancy.

We'll add the new policy to the configuration as:

```
"policies_configuration": {
(...))
    "supplied_policies": {
        "PCY-OE01-PROD-DEPTA-PROJ1-COMMON-SECURITY-POLICY": {
            "name": "pcy-oe01-prod-depta-proj1-common-security",
            "description": "Open LZ policy which allows the grp-pa-oe01-prod-deptA-proj1-prd-app-admins, grp-pa-oe01-prod-deptA-proj1-prd-db-admins and grp-pa-oe01-prod-deptA-proj1-prd-infra-admins user groups to access common security resources in the OE.",
            "compartment_id": "<OCID-COMPARTMENT-ROOT>",
            "statements": [
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to use vaults in compartment cmp-security",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to manage instance-images in compartment cmp-security",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to read vss-family in compartment cmp-security",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to use bastion in compartment cmp-security",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to manage bastion-session in compartment cmp-security",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to read logging-family in compartment cmp-security"
            ]
        }
    },
}
```

After updating your identity configuration, remember to run the plan/apply to update your OP.01 operation configuration.

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
