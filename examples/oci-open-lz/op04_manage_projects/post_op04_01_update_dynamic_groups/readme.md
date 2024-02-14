# POST.OP.04.01 – Update Dynamic Groups membership matching rule

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. IAM Configuration changes](#2-iam-configuration-changes)</br>

&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | POST.OP.04.01 |
| **OP. NAME** | Update Dynamic Groups membership matching rule | 
| **OBJECTIVE** | Update Dynamic Group for security functions matching rule after the creation of the application, database and infrastructure compartments of the OE01/Prod/Dept_A/Proj1. |
| **TARGET RESOURCES** | - **Security**: Dynamic Groups. |
| **IAM CONFIG**| [[open_lz_oe_01_prod_deptA_proj1_prd_identity.auto.tfvars.json](../open_lz_oe_01_prod_deptA_proj1_prd_identity.auto.tfvars.json)|
| **TERRAFORM MODULES**| [CIS IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](../../../../design/OCI_Open_LZ.pdf).|
| **PRE-ACTIVITIES** | [OP.04 Manage Projects](../readme.md) executed. |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | 1. [![Deploy_To_OCI](../../../images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-open-lz/archive/refs/heads/master.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op04_manage_projects/open_lz_oe_01_prod_deptA_proj1_prd_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op04_manage_projects/open_lz_oe_01_prod_deptA_proj1_prd_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “orm-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.2.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps mentioned in the [OP.04](../readme.md). |

&nbsp; 

## **2. IAM Configuration Changes**

After having the OCIDs of the OE01/Prod/Dept_A/Proj1 infrastructure, application and database compartments (cmp-oe01-p-deptA-proj1-prd-infra, cmp-oe01-p-deptA-proj1-prd-app & cmp-oe01-p-deptA-proj1-prd-db), replace the *'cmp-oe01-p-deptA-proj1-prd-infra'*, *'cmp-oe01-p-deptA-proj1-prd-app'* and *'cmp-oe01-p-deptA-proj1-prd-db'* in the matching_rule with the OCID value and run the plan/apply to reflect the changes in your tenancy.

```
...
    "dynamic_groups_configuration": {
        "dynamic_groups": {
            "DGP-OS-MANAGEMENT": {
                "name": "dgp-oe01-prod-depta-proj1-os-management",
                "description": "DGP.01 Holds the compartments which contain the VM images to be automatically patched by the OS Management Service.",
                "matching_rule": "ALL {instance.compartment.id = 'cmp-oe01-p-deptA-proj1-prd-app',instance.compartment.id = 'cmp-oe01-p-deptA-proj1-prd-infra'}"
            },
            "DGP-AUTONOMOUS-DB": {
                "name": "dgp-oe01-prod-depta-proj1-autonomous-db",
                "description": "DGP.02 Holds the compartments of Autonomous DBs which can use Security Resources like Vaults and Customer-Managed keys for encryption.",
                "matching_rule": "ALL {instance.compartment.id = 'cmp-oe01-p-deptA-proj1-prd-db'}"
            }
        }
    },
...
```

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.