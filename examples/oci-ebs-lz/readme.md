# Open LZ EBS extension Pattern.

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
| **OP. ID** | OP.02 |
| **OP. NAME** | Deploy EBS resources | 
| **OBJECTIVE** | Cover specific EBS network and security layers |
| **TARGET RESOURCES** | - **Security**: Compartments, Groups, Policies</br>- **Network**: Route tables, Security Lists  |
| **IAM CONFIGURATION**| [ebs_identity_cmp_grp_pl_v1.auto.tfvars.json](ebs_identity_cmp_grp_pl_v1.auto.tfvars.json)|
| **NETWORK CONFIGURATION** |[ebs_network_rt_sl_v1.auto.tfvars.json](ebs_network_rt_sl_v1.auto.tfvars.json) |
| **DETAILS** |  For more details refer to the [OCI Open LZ Design document](../../design/OCI_Open_LZ.pdf) |
| **PRE-ACTIVITIES** | Deploy CIS LZ  |
| **POST-ACTIVITIES** | N/A |
| **RUN WITH ORM** | TBC |
| **CONFIG & RUN - TERRAFORM CLI** | Follow the steps below. |

&nbsp; 

## **2. Setup Terraform Authentication**

For authenticating against the OCI tenancy terraform execute the following [instructions](../oci-open-lz/common_terraform_authentication.md).


&nbsp; 

## **3. Setup IAM Configuration**

For configuring and running the Open LZ EBS extension IAM layer use the following JSON file: [ebs_identity_cmp_grp_pl_v1.auto.tfvars.json](ebs_identity_cmp_grp_pl_v1.auto.tfvars.json) You can customize this configuration to fit your exact OCI IAM topology.

This configuration file will cover the following four categories of resources described in the next sections.

&nbsp; 

###  **3.1. Compartments**

The diagram below identifies the compartments in the scope of this operation.
&nbsp; 
![Diagram](diagrams/Compartments.png)
&nbsp; 

The corresponding json configuration for the compartment topology described above is: 

```
...
{
    "compartments_configuration": {
        "enable_delete": "true",
        "default_parent_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
        "compartments": {
            "CMP-EBS-KEY": {
                "name": "ebslz-ebs-cmp",
                "description": "EBS compartment for all resources related to EBS",
                "parent_id": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "defined_tags": null,
                "freeform_tags": null,
                "children": {
                    "CMP-EBS-PROD-KEY": {
                        "name": "esblz-ebs-prod-cmp",
                        "description": "EBS prod compartment",
                        "defined_tags": null,
                        "freeform_tags": {}
                    },
                    "CMP-EBS-NONPROD-KEY": {
                        "name": "esblz-ebs-nprod-cmp",
                        "description": "EBS non prod compartment",
                        "defined_tags": null,
                        "freeform_tags": {}
                    },
                    "CMP-EBS-MNGMT-KEY": {
                        "name": "esblz-ebs-mgt-cmp",
                        "description": "EBS management compartment",
                        "defined_tags": null,
                        "freeform_tags": {}
                    }
                }
            }
        }
    },
...
```

For extended documentation please refer to the [Identity & Access Management CIS Terraform module compartments example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/compartments/examples/vision/input.auto.tfvars.template).

&nbsp; 

### **3.2 Groups**

The diagram below identifies the groups in the scope of this operation.

&nbsp; 
![Diagram](diagrams/groups.png)
&nbsp; 

```
...
   "groups_configuration": {
        "default_defined_tags": null,
        "default_freeform_tags": null,
        "groups": {
            "ebslz-ebs-prod-admin-group": {
                "name": "ebslz-ebs-prod-admin-group",
                "description": "EBS extension group for ebs prod management"
            },
            "ebslz-ebs-nonprod-admin-group": {
                "name": "ebslz-ebs-nprod-admin-group",
                "description": "EBS extension group for ebs Non prod management"
            },
            "ebslz-ebs-mngmt-admin-group": {
                "name": "cislz-ebs-mgt-admin-group",
                "description": "EBS extension group for ebs management"
            }
        }
    },
...
```

This automation provides fully supports any kind of OCI IAM Groups topology to be specified in the json format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module groups example](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/groups/examples/vision/input.auto.tfvars.template).

&nbsp; 


### **3.3 Policies**

Although the [OCI Open LZ design document](../../design/OCI_Open_LZ.pdf) provides full coverage for shared infrastructure OCI IAM Policies topology, from the shared infrastructure configuration example this is not yet covered.

Meanwhile, you can proceed by updating with the desired policies, or use the following example:

```
...

    "policies_configuration": {
        "supplied_policies": {
            "ebslz-ebs-prod-admin-policy": {
                "name": "ebslz-ebs-prod-admin-policy",
                "description": "ebs policy",
                "compartment_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "statements": [
                    "allow group ebslz-ebs-prod-admin-group to read all-resources in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage instance-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage database-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage load-balancers in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage volume-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage tag-namespaces in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage alarms in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage metrics in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage object-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage orm-stacks in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage orm-jobs in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage orm-config-source-providers in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to read audit-events in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to read work-requests in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage bastion-session in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to read instance-agent-plugins in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage functions-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage api-gateway-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage ons-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage streams in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage cluster-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage logs in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage object-family in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage repos in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage cloudevents-rules in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to manage metrics in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to read instance-images in compartment ebslz-ebs-prod-cmp",
                    "allow group ebslz-ebs-prod-admin-group to read app-catalog-listing in compartment ebslz-ebs-prod-cmp"
                ]
            },
            "ebslz-ebs-nprod-admin-policy": {
                "name": "ebslz-ebs-nprod-admin-policy",
                "description": "ebs non prod policy",
                "compartment_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "statements": [
                    "allow group ebslz-ebs-nprod-admin-group to read all-resources in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage instance-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage database-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage load-balancers in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage volume-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage tag-namespaces in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to read all-resources in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage alarms in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage metrics in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage object-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage orm-stacks in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage orm-jobs in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage orm-config-source-providers in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to read audit-events in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to read work-requests in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage bastion-session in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to read instance-agent-plugins in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage functions-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage api-gateway-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage ons-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage streams in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage cluster-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage logs in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage object-family in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage repos in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to manage cloudevents-rules in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to read instance-images in compartment ebslz-ebs-nprod-cmp",
                    "allow group ebslz-ebs-nprod-admin-group to read app-catalog-listing in compartment ebslz-ebs-nprod-cmp"
                ]
            },
            "ebslz-ebs-mgt-admin-policy": {
                "name": "ebslz-ebs-mgt-admin-policy",
                "description": "ebs mngmt policy",
                "compartment_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "statements": [
                    "allow group ebslz-ebs-mgt-admin-group to read all-resources in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage instance-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage database-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage load-balancers in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage volume-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage tag-namespaces in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to read all-resources in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage alarms in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage metrics in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage object-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage orm-stacks in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage orm-jobs in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage orm-config-source-providers in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to read audit-events in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to read work-requests in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage bastion-session in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to read instance-agent-plugins in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage functions-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage api-gateway-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage ons-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage streams in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage cluster-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage logs in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage object-family in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage repos in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to manage cloudevents-rules in compartment ebslz-ebs-mgt-cmp",
                    "allow group ebslz-ebs-mgt-admin-group to read app-catalog-listing in compartment ebslz-ebs-mgt-cmp"
                ]
            },
            "ebslz-ebs-network-admin-policy": {
                "name": "ebslz-ebs-network-admin-policy",
                "description": "ebs neetwork policy",
                "compartment_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "statements": [
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to read virtual-network-family in compartment ebslz-network-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nonprod-admin-group to use vnics in compartment ebslz-network-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to manage private-ips in compartment ebslz-network-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nonprod-admin-group to use subnets in compartment ebslz-network-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to use network-security-groups in compartment ebslz-network-cmp"
                ]
            },
            "ebslz-ebs-security-admin-policy": {
                "name": "ebslz-ebs-security-admin-policy",
                "description": "ebs security policy",
                "compartment_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "statements": [
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to read vss-family in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to use vaults in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to read logging-family in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to use bastion in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to manage bastion-session in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to inspect keys in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to manage cloudevents-rules in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to manage alarms in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to manage metrics in compartment ebslz-security-cmp",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to read instance-agent-plugins in compartment ebslz-security-cmp"
                ]
            },
            "ebslz-ebs-root-admin-policy": {
                "name": "ebslz-ebs-root-admin-policy",
                "description": "ebs root policy",
                "compartment_ocid": "ocid1.compartment.oc1..aaaaaaaaxzexampleocid",
                "statements": [
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to inspect compartments in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to inspect users in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to inspect groups in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to use tag-namespaces in tenancy where target.tag-namespace.name='Oracle-Tags'",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to use tag-namespaces in tenancy where target.tag-namespace.name='Operations'",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to use cloud-shell in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to read usage-budgets in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to read usage-reports in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to manage app-catalog-listing in tenancy",
                    "allow group ebslz-ebs-mgt-admin-group, ebslz-ebs-prod-admin-group, ebslz-ebs-nprod-admin-group to inspect dynamic-groups in tenancy"
                ]
            }
        }
  
...
```

This automation fully supports any type of OCI IAM Policy to be specified in the json format. 
For an example of such configuration and for extended documentation please refer to the [Identity & Access Management CIS Terraform module policies examples](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/tree/main/policies/examples).


&nbsp; 

## **4. Setup Network Configuration**


For configuring and running the Open LZ EBS extension Network layer use the following JSON file: ebs_network_rt_sl_v1.auto.tfvars.json .This configuration covers the following networking diagram.

&nbsp; 

![Network Diagram](./diagrams/Netowrk.png)

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
-var-file ../examples/oci-ebs-lz/oci-credentials.tfvars.json \
-var-file ../examples/oci-ebs-lz/ebs_identity_cmp_grp_pl_v1.auto.tfvars.json \
-var-file ../examples/oci-ebs-lz/ebs_network_rt_sl_v1.auto.tfvars.json \
-state ../examples/oci-ebs-lz/terraform.tfstate
```

After the execution please analyze the output of the command above and check if it corresponds to your desired configuration.

Note that the ```terraform.tfstate``` file is generated in the configuration location and not in the terraform code location. This is the expected configuration as the terraform automation can support any number of configurations and the **state file** will belong to the configuration and not to the code.
  
The ideal scenario regarding the **state file** will be for each configuration to have a corresponding OCI Object Storage location for the state file. For more details on the Terraform state file recommended configuration please refer to the following [documentation](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/terraformUsingObjectStore.htm).

&nbsp; 

### **5.5 Run ```terraform apply```**

Run terraform plan with the IAM and Network configuration. After  its execution the configured resources will be provisioned or updated on OCI.

```
terraform apply \
-var-file ../examples/oci-ebs-lz/oci-credentials.tfvars.json \
-var-file ../examples/oci-ebs-lz/ebs_identity_cmp_grp_pl_v1.auto.tfvars.json \
-var-file ../examples/oci-ebs-lz/ebs_network_rt_sl_v1.auto.tfvars.json \
-state ../examples/oci-ebs-lz/terraform.tfstate

```

Depending on your json configuration configurations the output of the ```terraform apply``` should be identical or similar to this [example](./tf_apply_output_example.out).

