# OP.02 – Manage Operating Entity (OE)


## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. Setup Terraform Authentication](#2-setup-terraform-authentication)</br>
[3. Setup IAM Configuration](#3-setup-iam-configuration)</br>
[4. Setup Network Configuration](#4-setup-network-configuration)</br>
[5. Run the Configurations (Terraform Plan and Apply)](#5-run-the-configurations)</br>


&nbsp; 

## **1. Summary**

| |  |
|---|---| 
| **OP. ID** | OP.02 |
| **OP. NAME** | Manage Operating Entity | 
| **OBJECTIVE** | Onboards or changes an OE, creating the OE structures that will be used by the OE to create resources. |
| **TARGET RESOURCES** | - **Security**: Compartments, Groups, Policies</br>- **Network**: VCN, Subnets, SL, RT, DRG Attachments, Service/Internet Gateways. |
| **IAM CONFIG**| [open_lz_oe_01_identity.auto.tfvars.json](open_lz_oe_01_identity.auto.tfvars.json)|
| **NETWORK CONFIG** |[open_lz_oe_01_network.auto.tfvars.json](open_lz_oe_01_network.auto.tfvars.json) |
| **TERRAFORM MODULES**| [CIS IAM](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam), [CIS Network](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking)  |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](../../../../design/OCI_Open_LZ.pdf).|
| **PRE-ACTIVITIES** | [OP.01 Shared Services](../../shared/readme.md) executed. Update network config with OCID of the hub. |
| **POST-ACTIVITIES** | The first execution of this operation by the Central IT team requires the hand-over to the target OE Operations team the OCIDs for their OE core resources. |
| **RUN WITH ORM** | 1. [![Deploy_To_OCI](../../../../images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-open-lz/archive/refs/heads/master.zip&zipUrlVariables={"input_config_files_urls":"https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/operating-entities/oe01/open_lz_oe_01_identity.auto.tfvars.json,https://raw.githubusercontent.com/oracle-quickstart/terraform-oci-open-lz/master/examples/oci-open-lz/operating-entities/oe01/open_lz_oe_01_network.auto.tfvars.json"})  </br>2. Accept terms,  wait for the configuration to load. </br>3. Set the working directory to “orm-facade”. </br>4. Set the stack name you prefer.</br>5. Set the terraform version to 1.2.x. Click Next. </br>6. Accept the default configurations. Click Next. Optionally, replace with your json/yaml config files. </br>8. Un-check run apply. Click Create.|

&nbsp; 

## **2. Setup Terraform Authentication**

For authenticating against the OCI tenancy terraform execute the following [instructions](/examples/oci-open-lz/common_terraform_authentication.md).


&nbsp; 

## **3. Setup IAM Configuration**

For configuring and running the OCI Open LZ Manage OE IAM layer use the following JSON file: [open_lz_oe_01_identity.auto.tfvars.json](./open_lz_oe_01_identity.auto.tfvars.json). You can customize this  configuration to fit your exact OCI IAM topology.

This configuration file will cover the following four categories of resources described in the next sections.

&nbsp; 

###  **3.1. Compartments**

The diagram below identifies the compartments in the scope of this operation.

&nbsp; 

![Diagram](diagrams/OCI_Open_LZ_OP02_ManageOE_Compartments.png)

&nbsp; 

The corresponding JSON configuration for the compartments topology described above is: 

```
...
    "compartments_configuration": {
        "enable_delete": "true",
        "default_parent_ocid": "ocid1.tenancy.oc1..aaaaaaaaexampleocid",
        "compartments": {
            "CMP-OE01-KEY": {
                "name": "cmp-oe1",
                "description": "oci-open-lz-customer OE-01 top compartment",
                "defined_tags": null,
                "freeform_tags": {
                    "oci-open-lz": "oci-open-lz-oe01",
                    "oci-open-lz-customer": "oci-open-lz-customer",
                    "oci-open-lz-cmp": "oe-top"
                },
                "children": {
                    "CMP-OE01-COMMON-KEY": {
                        "name": "cmp-oe01-common",
                        "description": "oci-open-lz-customer OE01 common Compartment",
                        "defined_tags": null,
                        "freeform_tags": {
                            "oci-open-lz": "oci-open-lz-oe01-common",
                            "oci-open-lz-customer": "oci-open-lz-customer",
                            "oci-open-lz-cmp": "oe-common"
                        },
                        "children": {
                            "CMP-OE01-COMMON-INFRA-KEY": {
                                "name": "cmp-oe01-common-infra",
                                "description": "oci-open-lz-customer OE01 common infra Compartment",
                                "defined_tags": null,
                                "freeform_tags": {
                                    "oci-open-lz": "oci-open-lz-oe01-common-infra",
                                    "oci-open-lz-customer": "oci-open-lz-customer",
                                    "oci-open-lz-cmp": "oe-common-infra"
                                }
                            },
                            "CMP-OE01-COMMON-NETWORK-KEY": {
                                "name": "cmp-oe01-common-network",
                                "description": "oci-open-lz-customer OE01 common network Compartment",
                                "defined_tags": null,
                                "freeform_tags": {
                                    "oci-open-lz": "oci-open-lz-oe01-common-network",
                                    "oci-open-lz-customer": "oci-open-lz-customer",
                                    "oci-open-lz-cmp": "oe-common-network"
                                }
                            }
                        }
                    },
                    "CMP-OE01-SANDBOX-KEY": {
                        "name": "cmp-oe01-sandbox",
                        "description": "oci-open-lz-customer OE01 sandbox Compartment",
                        "defined_tags": null,
                        "freeform_tags": {
                            "oci-open-lz": "oci-open-lz-oe01-sandbox",
                            "oci-open-lz-customer": "oci-open-lz-customer",
                            "oci-open-lz-cmp": "oe-sandbox"
                        }
                    },
                    "CMP-OE01-DEVELOPMENT-KEY": {
                        "name": "cmp-oe01-development",
                        "description": "oci-open-lz-customer OE01 development Compartment",
                        "defined_tags": null,
                        "freeform_tags": {
                            "oci-open-lz": "oci-open-lz-oe01-development",
                            "oci-open-lz-customer": "oci-open-lz-development",
                            "oci-open-lz-cmp": "oe-development"
                        }
                    },
                    "CMP-OE01-NONPROD-KEY": {
                        "name": "cmp-oe01-nonprod",
                        "description": "oci-open-lz-customer OE01 nonprod Compartment",
                        "defined_tags": null,
                        "freeform_tags": {
                            "oci-open-lz": "oci-open-lz-oe01-nonprod",
                            "oci-open-lz-customer": "oci-open-lz-nonprod",
                            "oci-open-lz-cmp": "oe-nonprod"
                        }
                    },
                    "CMP-OE01-PROD-KEY": {
                        "name": "cmp-oe01-prod",
                        "description": "oci-open-lz-customer OE01 prod Compartment",
                        "defined_tags": null,
                        "freeform_tags": {
                            "oci-open-lz": "oci-open-lz-oe01-prod",
                            "oci-open-lz-customer": "oci-open-lz-prod",
                            "oci-open-lz-cmp": "oe-prod"
                        }
                    }
                }
            }
        }
    }
...
```


For extended documentation please refer to the [Identity & Access Management CIS Terraform module compartments example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/compartments/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **3.2 Groups**

Although the [OCI Open LZ design document](../../../design/OCI_Open_LZ.pdf) provides full coverage for shared infrastructure OCI IAM Groups topology, from the shared infrastructure configuration example this is not yet covered.

Meanwhile, you can proceed by updating with the desired groups, or use the empty groups configuration looks like in the example below:

```
...
    "groups_configuration": {
        "groups": {}
    }
...
```

This automation provides fully supports any kind of OCI IAM Groups topology to be specified in the JSON format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module groups example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/groups/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **3.3 Dynamic Groups**


Although the [OCI Open LZ design document](../../../design/OCI_Open_LZ.pdf) provides full coverage for shared infrastructure OCI IAM Dynamic Groups topology, from the shared infrastructure configuration example this is not yet covered.

Meanwhile, you can proceed by updating with the desired dynamic groups, or use the empty groups configuration looks like in the example below:

```
...
    "dynamic_groups_configuration": {
        "dynamic_groups": {}
    }
...
```

This automation provides fully supports any kind of OCI IAM Dynamic Groups to be specified in the JSON format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module dynamic groups example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/dynamic-groups/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **3.4 Policies**

Although the [OCI Open LZ design document](../../../design/OCI_Open_LZ.pdf) provides full coverage for shared infrastructure OCI IAM Policies topology, from the shared infrastructure configuration example this is not yet covered.

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

This automation provides fully supports any type of OCI IAM Policy  to be specified in the JSON format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module policies examples](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/policies/examples).


&nbsp; 

## **4. Setup Network Configuration**

For configuring the OCI Open LZ Shared Infrastructure Network layer open and edit the following JSON configuration file: [open_lz_oe_01_network.auto.tfvars.json](./open_lz_oe_01_network.auto.tfvars.json). This configuration covers the following networking diagram.

&nbsp; 

![Network Diagram](diagrams/OCI_Open_LZ_OP02_ManageOE_Network.png)


You can customize this JSON configuration to fit your exact OCI Networking topology. This terraform automation is extremely versatible and can support any type of network topology. 

For complete documentation and a larger set of examples on configuring an OCI networking topology using this JSON terraform automation approach please refer to the [OCI CIS Terraform Networking Module](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) documentation and examples.

The examples given with this code, expects to find valid certificates in your home directory to import into the Load Balancers to be created for SSL connections. If you don't have any valid certificates signed by a trusted CA, you can create self-signed certificates to run the examples following the instructions in [LBaaS self-signed certificates creation example](../../common_lbaas_self-signed_certificates_howto.md).

&nbsp; 

## **5. Run the Configurations**
&nbsp; 

### **5.1 Clone this Git repo to your Machine**

```
git clone git@github.com:oracle-quickstart/terraform-oci-open-lz.git?ref=v1.0.0
```

For referring to a specific module version, append *ref=\<version\>* to the *source* attribute value.

&nbsp; 

###  **5.2 Change the Directory to the Terraform Orchestrator Module**

 Change the directory to the [```terraform-oci-open-lz/orchestrator```](../../../../orchestrator/) terraform orchestrator module.

&nbsp; 

 ### **5.3 Run ```terraform init```**

Run terraform init to download all the required external terraform providers and terraform modules. See [command example](./tf_init_output_example.out) for more details on the expected output.

&nbsp; 

 ### **5.4 Run ```terraform plan```**

Run ```terraform plan``` with the IAM and Network configuration.

```
terraform plan \
-var-file ../examples/oci-open-lz/operating-entities/oe01/oci-credentials.tfvars.json \
-var-file ../examples/oci-open-lz/operating-entities/oe01/open_lz_oe_01_identity.auto.tfvars.json \
-var-file ../examples/oci-open-lz/operating-entities/oe01/open_lz_oe_01_network.auto.tfvars.json \
-state ../examples/oci-open-lz/operating-entities/oe01/terraform.tfstate
```

After the execution please analyze the output of the command above and check if it corresponds to your desired configuration.

Note that the ```terraform.tfstate``` file is generated in the configuration location and not in the terraform code location. This is the expected configuration as the terraform automation can support any number of configurations and the **state file** will belong to the configuration and not to the code.
  
The ideal scenario regarding the **state file** will be for each configuration to have a corresponding OCI Object Storage location for the state file. For more details on the Terraform state file recommended configuration please refer to the following [documentation](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/terraformUsingObjectStore.htm).

&nbsp; 

### **5.5 Run ```terraform apply```**

Run ```terraform apply``` with the IAM and Network configuration. After its execution the configured resources will be provisioned or updated on OCI.

```
terraform apply \
-var-file ../examples/oci-open-lz/operating-entities/oe01/oci-credentials.tfvars.json \
-var-file ../examples/oci-open-lz/operating-entities/oe01/open_lz_oe_01_identity.auto.tfvars.json \
-var-file ../examples/oci-open-lz/operating-entities/oe01/open_lz_oe_01_network.auto.tfvars.json \
-state ../examples/oci-open-lz/operating-entities/oe01/terraform.tfstate
```

Depending on your JSON configuration configurations the output of the ```terraform apply``` should be identical or similar to this [example](./tf_apply_output_example.out).

&nbsp; 

# License

Copyright (c) 2023 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
