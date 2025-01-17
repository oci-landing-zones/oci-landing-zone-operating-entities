# POST.OP.01.01 – Update Dynamic Group membership matching rule

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. IAM Configuration changes](#2-iam-configuration-changes)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.01.01 |
| **OP. NAME** | Update Dynamic Group membership matching rule | 
| **OBJECTIVE** | Update Dynamic Group for security functions matching rule after the creation of the shared security compartment. |
| **TARGET RESOURCES** | - **Security**: Dynamic Groups. |
| **IAM CONFIG**| [open_lz_oe_01_identity.auto.tfvars.json](../final_configs_after_postops/open_lz_shared_identity.auto.tfvars.json)|
| **TERRAFORM MODULES**| [CIS Landing Zone IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Multi-OE Design document](/blueprints/multi-oe/generic_v1/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf).|
| **PRE-ACTIVITIES** | [OP.01 Shared Services](../readme.md) executed. Update network config with OCID of the hub. |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [<img src="../../../../../commons/images/DeployToOCI.svg"  height="30" align="center">](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.0.5.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “rms-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.5.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.01](../readme.md). |

&nbsp; 

## **2. IAM Configuration Changes**

After having the OCID of the security compartment (cmp-security), replace the '<OCID-COMPARTMENT-SECURITY>' in the matching_rule with the OCID value and run the plan/apply to reflect the changes in your tenancy.

```
...
   "dynamic_groups_configuration": {
        "default_defined_tags": null,
        "default_freeform_tags": null,
        "dynamic_groups": {
            "DGP-SEC-FUN": {
                "name": "dgp-security-functions",
                "description": "DGP.01 Allows all resources of type fnfunc in the Security compartment, cmp-security..",
                "matching_rule": "ALL {resource.type = 'fnfun', resource.compartment.id = '<OCID-COMPARTMENT-SECURITY>'}"
            }
        }
    }
...
```

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
