# OP.03 – Manage Department

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. Setup IAM Configuration](#2-setup-iam-configuration)</br>
[3. Run with ORM](#3-run-with-orm) </br>
[4. Run with TF CLI](#4-run-with-terraform-cli)


&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | OP.03 |
| **OP. NAME** | Manage Department | 
| **OBJECTIVE** | Creates and changes a department structure within an OE environment. |
| **TARGET RESOURCES** | - **Security**: Compartments, Groups, Policies</br> |
| **IAM CONFIG**| [open_lz_oe_01_prod_DEP_A_identity.auto.tfvars.json](open_lz_oe_01_prod_dep_a_identity.auto.tfvars.json)|
| **TERRAFORM MODULES**| [CIS IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) |
| **DETAILS** |  For more details refer to the  [OCI Open LZ Multi-OE Design document](/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf).|
| **PRE-ACTIVITIES** | An Operating Entity onboarded with [OP.02 Manage Operating Entity (OE)](/multi-oe/runtime/op02_manage_oes/oe01/readme.md). |
| **POST-ACTIVITIES** | The execution of this operation by the OE Ops Team creates the department in an specific OE environment. Replicate for other existing OE environments where the department should belong to. |
| **RUN OPERATION** | Use [ORM](#3-run-with-orm) or use [Terraform CLI](#4-run-with-terraform-cli). |


&nbsp; 

## **2. Setup IAM Configuration**

For configuring and running the OCI Open LZ Manage Dept IAM layer use the following JSON file: [open_lz_oe_01_prod_deptA_identity.auto.tfvars.json](./open_lz_oe_01_prod_deptA_identity.auto.tfvars.json). You can customize this configuration to fit your exact OCI IAM topology.

This configuration file will cover the following four categories of resources described in the next sections.

&nbsp; 

###  **2.1. Compartments**

The diagram below identifies the compartments in the scope of this operation.

&nbsp; 

![Diagram](./diagrams/OCI_Open_LZ_OP03_ManageDept_Compartments.jpg)

&nbsp; 

The corresponding JSON configuration for the compartment topology described above is: 

```
...
    {
    "compartments_configuration": {
        "enable_delete": "true",
        "default_parent_id": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
        "compartments": {
            "CMP-OE01-PROD-DEPT-A-KEY": {
                "name": "cmp-oe1-p-deptA",
                "description": "oci-open-lz-customer OE-01 Production environment, Department A compartment",
                "defined_tags": null,
                "freeform_tags": {
                    "oci-open-lz": "oci-open-lz-oe01",
                    "oci-open-lz-customer": "oci-open-lz-customer",
                    "oci-open-lz-cmp": "oe-top"
                }
            }
        }
    },
    "groups_configuration": {
        "groups": {}
    },
    "dynamic_groups_configuration": {
        "dynamic_groups": {}
    },
    "policies_configuration": {
        "supplied_policies": {}
    }
}
...
```


For extended documentation please refer to the [Identity & Access Management CIS Terraform module compartments example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/compartments/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **2.2 Groups**

The [OCI Open LZ Multi-OE Design document](/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf) provides explanation of the possible separation of duties with the different tenancy structure levels. The department structure is optional.

Meanwhile, you can proceed by updating with the desired groups, or use the empty groups configuration looks like in the example below:

```
...
    "groups_configuration": {
        "groups": {}
    }
...
```

This automation fully supports any kind of OCI IAM Group topology to be specified in the JSON format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module groups example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/groups/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **2.3 Dynamic Groups**

The [OCI Open LZ Multi-OE [Design document](/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf) explains the possible separation of duties with the different tenancy structure levels. It is not specified for the departments any configuration.

Meanwhile, you can proceed by updating with the desired dynamic groups, or use the empty groups configuration looks like in the example below:

```
...
    "dynamic_groups_configuration": {
        "dynamic_groups": {}
    }
...
```

This automation fully supports any kind of OCI IAM Dynamic Groups to be specified in the JSON format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module dynamic groups example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/dynamic-groups/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **2.4 Policies**

The [OCI Open LZ Multi-OE Design document](/multi-oe/design/OCI_Open_LZ_Multi-OE-Blueprint.pdf) provides full explanation of the possible separation of duties with the different tenancy structure levels. It is not specified for the departments any configuration.

Meanwhile, you can proceed by updating with the desired policies, or use the following example:

```
...
    "policies_configuration": {
        "enable_compartment_level_template_policies": "false",
        "enable_tenancy_level_template_policies": "false",
        "enable_cis_benchmark_checks": "false",
        "groups_with_tenancy_level_roles": []
    }
...
```

This automation provides fully supports any type of OCI IAM Policy to be specified in the JSON format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module policies examples](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/policies/examples).


&nbsp; 

## **3. Run with ORM**

| STEP |  ACTION |
|---|---| 
| **1** |  [![Deploy_To_OCI](/images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-landing-zones-orchestrator/archive/refs/tags/v2.0.0.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/op03_manage_department/open_lz_oe_01_prod_deptA_identity.auto.tfvars.json"})  |
| **2** | Accept terms,  wait for the configuration to load. |
| **3** | Set the working directory to “rms-facade”. | 
| **4** | Set the stack name you prefer. | 
| **5** |  Set the terraform version to 1.2.x. Click Next. | 
| **6** | Accept the defaul configurations. Click Next. Optionally,replace with your json/yaml config files. |
| **7** | Un-check run apply. Click Create. 

&nbsp; 

## **4. Run with Terraform CLI**
&nbsp; 


### **4.1. Setup Terraform Authentication**

For authenticating against the OCI tenancy terraform execute the following [instructions](/examples/oci-open-lz/common_terraform_authentication.md).

&nbsp; 

### **4.2 Clone this Git repo to your Machine**

Cloning the latest version:
```
git clone git@github.com:oracle-quickstart/terraform-oci-open-lz.git
```

&nbsp; 

### **4.3 Clone the orchestrator Git repo to your Machine**

Cloning the latest version:
```
git clone git@github.com:oracle-quickstart/terraform-oci-landing-zones-orchestrator.git
```

&nbsp; 

###  **4.4 Change the Directory to the Terraform Orchestrator Module**

Change the directory to the *terraform-oci-landing-zones-orchestrator* Terraform orchestrator module.

&nbsp; 

 ### **4.5 Run ```terraform init```**

Run ```terraform init``` to download all the required external terraform providers and Terraform modules.

&nbsp; 

 ### **4.6 Run ```terraform plan```**

Run ```terraform plan``` with the IAM and Network configuration.

```
terraform plan \
-var-file ../terraform-oci-open-lz/examples/oci-open-lz/op03_manage_department/oci-credentials.tfvars.json \
-var-file ../terraform-oci-open-lz/examples/oci-open-lz/op03_manage_department/open_lz_oe_01_prod_deptA_identity.auto.tfvars.json \
-state ../terraform-oci-open-lz/examples/oci-open-lz/op03_manage_department/terraform.tfstate
```

After the execution please analyze the output of the command above and check if it corresponds to your desired configuration.

Note that the ```terraform.tfstate``` file is generated in the configuration location and not in the Terraform code location. This is the expected configuration as the Terraform automation can support any number of configurations and the **state file** will belong to the configuration and not to the code.
  
The ideal scenario regarding the **state file** will be for each configuration to have a corresponding OCI Object Storage location for the state file. For more details on the Terraform state file recommended configuration please refer to the following [documentation](https://docs.oracle.com/iaas/Content/API/SDKDocs/terraformUsingObjectStore.htm).

&nbsp; 

### **4.7 Run ```terraform apply```**

Run ```terraform apply``` with the IAM and Network configuration. After its execution, the configured resources will be provisioned or updated on OCI.

```
terraform apply \
-var-file ../terraform-oci-open-lz/examples/oci-open-lz/op03_manage_department/oci-credentials.tfvars.json \
-var-file ../terraform-oci-open-lz/examples/oci-open-lz/op03_manage_department/open_lz_oe_01_prod_deptA_identity.auto.tfvars.json \
-state ../terraform-oci-open-lz/examples/oci-open-lz/op03_manage_department/terraform.tfstate
```

&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
