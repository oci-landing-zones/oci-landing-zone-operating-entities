# POST.OP.02.02 – Update Dynamic Group membership matching rule

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. IAM Configuration changes](#2-iam-configuration-changes)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.02.02 |
| **OP. NAME** | Update Dynamic Group membership matching rule | 
| **OBJECTIVE** | Update Dynamic Group for security functions matching rule after the creation of the shared common infrastructure compartment. |
| **TARGET RESOURCES** | - **Security**: Dynamic Groups. |
| **IAM CONFIG**| [open_lz_oe_01_identity.auto.tfvars.json](../final_configs_after_postops/open_lz_oe_01_identity.auto.tfvars.json)|
| **TERRAFORM MODULES**| [CIS IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](/blueprints/multi-oe/generic_v1/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf).|
| **PRE-ACTIVITIES** | [OP.02 Manage OEs](../readme.md) executed.  |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [<img src="../../../../../../commons/images/DeployToOCI.svg"  height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.8.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op02_manage_oes/oe01/open_lz_oe_01_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op02_manage_oes/oe01/open_lz_oe_01_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “rms-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.5.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.02](../readme.md). |

&nbsp; 

## **2. IAM Configuration Changes**

After having the OCID of the OE01 common infrastructure compartment (cmp-oe01-common-infra), replace the *'OCID-CMP-OE01-COMMON-INFRA'* in the matching_rule with the OCID value and run the plan/apply to reflect the changes in your tenancy.

```
...
   "dynamic_groups_configuration": {
        "default_defined_tags": null,
        "default_freeform_tags": null,
        "dynamic_groups": {
            "DGP-OS-MANAGEMENT": {
                "name": "dgp-os-management",
                "description": "DGP.01 Holds the compartments which contain the VM images to be automatically patched by the OS Management Service.",
                "matching_rule": "ALL {instance.compartment.id = '<OCID-CMP-OE01-COMMON-INFRA>'}"
            }
        }
    }
...
```

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
