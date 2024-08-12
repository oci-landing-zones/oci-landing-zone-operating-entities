# POST.OP.02.03 – Update IAM Policies to allow OE Project Teams to access shared resources

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. IAM Configuration changes](#2-iam-configuration-changes)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.02.03 |
| **OP. NAME** | Update IAM Policies to allow OE Project Teams to access shared resources | 
| **OBJECTIVE** | Grant access to OE Project Teams to access to some global shared resources. |
| **TARGET RESOURCES** | - **Security**: Policies. |
| **IAM CONFIG**| [open_lz_oe_01_identity.auto.tfvars.json](../final_configs_after_postops/open_lz_oe_01_identity.auto.tfvars.json)|
| **TERRAFORM MODULES**| [CIS IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](/blueprints/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf).|
| **PRE-ACTIVITIES** | [OP.04 Manage Projects](../../../op04_manage_projects) executed. Specifict OE Project Team IAM Groups created.  |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [<img src="../../../../../../commons/images/DeployToOCI.svg"  height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-landing-zones-orchestrator/archive/refs/tags/v2.0.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op02_manage_oes/oe01/open_lz_oe_01_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op02_manage_oes/oe01/open_lz_oe_01_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “rms-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.2.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.02](../readme.md). |

&nbsp; 

## **2. IAM Configuration Changes**

With the execution of [OP.04 Manage Projects](../../../op04_manage_projects), the IAM groups for specific project and layer teams are created, like the ones referenced in the Open LZ design (GRP.OE.03 & GRP.OE.04). These groups manages resources for OE01, Prod environment, Department A, Project 1, application or DB layers.

These groups needs to get access to some shared elements, like the OE networking elements in the OE common network compartment.

We'll create a new policy for all the grops that need access to the same shared resources. Replace the *'OCID-CMP-OE01-COMMON'* with the OCID of OE01 common compartment..

We'll add the new policy to the configuration as:

```
"policies_configuration": {
(...))
    "supplied_policies": {
        (...)
        "PCY-OE01-PROD-DEPTA-PROJ1-COMMON-NETWORK-POLICY": {
            "name": "pcy-oe01-prod-depta-proj1-app-common-network",
            "description": "Open LZ policy which allows the grp-pa-oe01-prod-deptA-proj1-prd-app-admins, grp-pa-oe01-prod-deptA-proj1-prd-db-admins and grp-pa-oe01-prod-deptA-proj1-prd-infra-admins user groups to access common networking resources in the OE.",
            "compartment_id": "'<OCID-CMP-OE01-COMMON>'",
            "statements": [
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to read virtual-network-family in compartment cmp-oe01-common-network",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to use subnets in compartment cmp-oe01-common-network",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to use network-security-groups in compartment cmp-oe01-common-network",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to use vnics in compartment cmp-oe01-common-network",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to manage private-ips in compartment cmp-oe01-common-network",
                "allow group grp-pa-oe01-prod-deptA-proj1-prd-app-admins,grp-pa-oe01-prod-deptA-proj1-prd-db-admins,grp-pa-oe01-prod-deptA-proj1-prd-infra-admins to use load-balancers in compartment cmp-oe01-common-network"
            ]
        }
}
```

After updating your identity configuration, remember to run the plan/apply to update your OP.02 operation configuration.

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
