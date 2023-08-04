# OP.01 – Manage Shared Services

## **Table of Contents**

[1. Summary](#1-summary)</br>
[2. Setup Terraform Authentication](#2-setup-terraform-authentication)</br>
[3. Setup IAM Configuration](#3-setup-iam-configuration)</br>
[4. Setup Network Configuration](#4-setup-network-configuration)</br>
[5. Run the Configurations (TF Plan & Apply)](#5-run-the-configurations)</br>


&nbsp; 

## **1. Summary**


| |  |
|---|---| 
| **OP. ID** | OP.01 |
| **OP. NAME** | Manage Shared Services | 
| **OBJECTIVE** | Creates or changes the shared elements of the landing zone and applies posture management |
| **TARGET RESOURCES** | - **Security**: Compartments, Groups, Policies</br>- **Network**: DRG, VCN, Subnets, SL, RT, DRG Attach., Network Firewall, DNS, Load Balancers  |
| **IAM CONFIGURATION**| [open_lz_shared_identity.auto.tfvars.json](open_lz_shared_identity.auto.tfvars.json)|
| **NETWORK CONFIGURATION** |[open_lz_shared_network.auto.tfvars.json](open_lz_shared_network.auto.tfvars.json) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](../../../design/OCI_Open_LZ.pdf) |
| **PRE-ACTIVITIES** | N/A |
| **POST-ACTIVITIES** | N/A |
| | |

&nbsp; 

## **2. Setup Terraform Authentication**

For authenticating against the OCI tenancy terraform execute the following [instructions](/examples/oci-open-lz/common_terraform_authentication.md).


&nbsp; 

## **3. Setup IAM Configuration**

For configuring and running the OCI Open LZ Shared IAM layer use the following JSON file: [open_lz_shared_identity.auto.tfvars.json](open_lz_shared_identity.auto.tfvars.json). You can customize this  configuration to fit your exact OCI IAM topology.

This configuration file will cover the following four categories of resources described in the next sections.

&nbsp; 

###  **3.1. Compartments**

The diagram below identifies the compartments in the scope of this operation.

&nbsp; 

![Diagram](diagrams/OCI_Open_LZ_SharedInfrastructure_Compartments.png)

&nbsp; 

The corresponding json configuration for the compartments topology described above is: 

```
...
    "compartments_configuration": {
        "enable_delete": "true",
        "default_parent_ocid": "ocid1.tenancy.oc1..aaaaaaaaxzpxbcag7zgamh2erlggqro3y63tvm2rbkkjz4z2zskvagupiz7a",
        "compartments": {
            "CMP-SECURITY-KEY": {
                "name": "cmp-security",
                "description": "oci-open-lz-customer Shared Security Compartment",
                "parent_id": "ocid1.tenancy.oc1..aaaaaaaaxzpxbcag7zgamh2erlggqro3y63tvm2rbkkjz4z2zskvagupiz7a",
                "defined_tags": null,
                "freeform_tags": {
                    "oci-open-lz": "openlz-shared",
                    "oci-open-lz-customer": "oci-open-lz-customer",
                    "oci-open-lz-cmp": "security"
                }
            },
            "CMP-NETWORK-KEY": {
                "name": "cmp-network",
                "description": "oci-open-lz-customer Shared Network Compartment",
                "parent_id": "ocid1.tenancy.oc1..aaaaaaaaxzpxbcag7zgamh2erlggqro3y63tvm2rbkkjz4z2zskvagupiz7a",
                "defined_tags": null,
                "freeform_tags": {
                    "oci-open-lz": "openlz-shared",
                    "oci-open-lz-customer": "oci-open-lz-customer",
                    "oci-open-lz-cmp": "network"
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
        "default_defined_tags": null,
        "default_freeform_tags": null,
        "groups": {
            "GRP-IAM-ADMINS": {
                "name": "grp-iam-admins",  
                "description": "GRP.01 Tenancy global Identity and access management administrator."
            },
            "GRP-CREDENTIAL-ADMINS": { 
                "name": "grp-credential-admins",  
                "description": "GRP.02 Tenancy global credential administrator."
            },
            "GRP-ANNOUNCEMENT-READERS": { 
                "name": "grp-announcement-readers",  
                "description": "GRP.03 Tenancy global readers of OCI monitoring information."
            },
            "GRP-BUDGET-ADMINS": { 
                "name": "grp-budget-admins",  
                "description": "GRP.04 Tenancy global budget control."
            }, 
            "GRP-AUDITORS": { 
                "name": "grp-auditors",  
                "description": "GRP.05 Tenancy global read access (for security auditing or health checks)."
            }, 
            "GRP-NETWORK-ADMINS": { 
                "name": "grp-network-admins",  
                "description": "GRP.06 Tenancy global and shared network administration group, including common OE network elements."
            }, 
            "GRP-SECURITY-ADMINS": { 
                "name": "grp-security-admins",  
                "description": "GRP.07 Tenancy global and shared security administration group."
            }
        }
    },
...
```

This automation provides fully supports any kind of OCI IAM Groups topology to be specified in the json format. 
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

This automation provides fully supports any kind of OCI IAM Dynamic Groups to be specified in the json format. 
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

This automation provides fully supports any type of OCI IAM Policy  to be specified in the json format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module policies examples](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/policies/examples).


&nbsp; 

## **4. Setup Network Configuration**

For configuring the OCI Open LZ Shared Infrastructure Network layer open and edit the following JSON configuration file: [open_lz_shared_network.auto.tfvars.json](open_lz_shared_network.auto.tfvars.json). This configuration covers the following networking diagram.

&nbsp; 

![Network Diagram](./diagrams/OCI_Open_LZ_SharedInfrastructure_Network.png)


You can customize this json configuration to fit your exact OCI Networking topology. This terraform automation is extremely versatible and can support any type of network topology. 

For complete documentation and a larger set of examples on configuring an OCI networking topology using this json terraform automation approach please refer to the [OCI CIS Terraform Networking Module](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) documentation and examples.

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

Run terraform plan with the IAM and Network configuration.

```
terraform plan \
-var-file ../examples/oci-open-lz/shared/oci-credentials.tfvars.json \
-var-file ../examples/oci-open-lz/shared/open_lz_shared_identity.auto.tfvars.json \
-var-file ../examples/oci-open-lz/shared/open_lz_shared_network.auto.tfvars.json \
-state ../examples/oci-open-lz/shared/terraform.tfstate
```

After the execution please analyze the output of the command above and check if it corresponds to your desired configuration.

Note that the ```terraform.tfstate``` file is generated in the configuration location and not in the terraform code location. This is the expected configuration as the terraform automation can support any number of configurations and the **state file** will belong to the configuration and not to the code.
  
The ideal scenario regarding the **state file** will be for each configuration to have a corresponding OCI Object Storage location for the state file. For more details on the Terraform state file recommended configuration please refer to the following [documentation](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/terraformUsingObjectStore.htm).

&nbsp; 

### **5.5 Run ```terraform apply```**

Run terraform plan with the IAM and Network configuration. After  its execution the configured resources will be provisioned or updated on OCI.

```
terraform apply \
-var-file ../examples/oci-open-lz/shared/oci-credentials.tfvars.json \
-var-file ../examples/oci-open-lz/shared/open_lz_shared_identity.auto.tfvars.json \
-var-file ../examples/oci-open-lz/shared/open_lz_shared_network.auto.tfvars.json \
-state ../examples/oci-open-lz/shared/terraform.tfstate
```

Depending on your json configuration configurations the output of the ```terraform apply``` should be identical or similar to this [example](./tf_apply_output_example.out).
