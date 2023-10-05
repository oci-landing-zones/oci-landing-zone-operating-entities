# The OCI Open LZ Orchestrator Module



## **Table of Contents**

[1. Overview](#1-overview)</br>
[2. IAM Requirements](#2-iam-requirements)</br>
[3. How to Invoke the Module](#3-how-to-invoke-the-module)</br>
[4. How to Use the module](#4-how-to-use-the-module)</br>
[5. Using the Module with ORM](#5-using-the-module-with-orm)</br>
[6. Related Documentation](#6-related-documentation)</br>
[7. Contributing](#7-contributing)</br>
[8 License](#8-license)</br>
[9. Known Issues](#9-known-issues)</br>
&nbsp; 


## **1. Overview**
The **OCI Open LZ Orchestrator Terraform module** enables the **provisioning and change** of **Terraform OCI CIS LZ Enhanced Modules resources** in **one single operation**. With this capability, cloud operations on any landing zone following this model tend to be very simple, as it is possible to use different types of resources in one command, and this module will sort out the Terraform resource dependency graph for you.

In the current version, the following resources are integrated or being integrated:

- [Identity & Access Management ](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam) (orchestrated)
- [Networking](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking) (orchestrated)
- [Governance](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-governance) (orchestration in progress)
- [Security](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-security) (orchestration in progress)
- [Observability & Monitoring](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-observability) (orchestration in progress)

 

Review the **[module specification](./SPEC.md)** for a full description of module requirements, supported variables, managed resources and outputs.

This module uses **Terraform complex types** and optional attributes, to create a new abstraction layer on top of Terraform. 
This abstraction layer allows the specification of any identity and/or networking topology containing any set of resources such as compartments, groups, dynamic groups, policies, VCNs, subnets, DRGs, and others and mapping them on any existing compartments topology.

It allows both the creation a **any new complex networking topology** and  **injecting resources** into any existing networking topology by following the same abstraction layer format. The abstraction layer format can be HCL (```*.tfvars``` or ```*.auto.tfvars```) or JSON (```*.tfvars.json``` or ```*.auto.tfvars.json```).

This approach represents an excellent tool for creating **templates**. The templates should be created and managed in the configuration or operations repository, outside the code repository. This separation enables clean cloud operations, with **separations of concerns between configuration and infrastructure as code**. The ```*.tfvars.*``` can be used as sharable templates that define different and complex topologies that can correspond to any landing zone design.

The main advantage of this approach is that there will be one single code repository for any landing zone arhitecture configuration. **The creation of a new landing zones configurations will not have any impact on the Terraform code,** it will just impact the configuration files (```*.tfvars.*``` files).

The separation of code and configuration supports DevOps key concepts for operations design, change management, pipelines. For more details refer to the Operations View chapter on the [OCI Open LZ Design document](../../../../design/OCI_Open_LZ.pdf).

&nbsp; 

## **2. IAM Requirements**

This module requires the following OCI IAM permissions.

### **2.1 For the IAM compartments module**

This module requires the following OCI IAM permission in compartments referred by *default_parent_ocid* and/or *parent_ocid*:
```
Allow group <group> to manage compartments in compartment <parent_compartment_name>
```
If parent is the root compartment, the permission becomes:
```
Allow group <group> to manage compartments in tenancy
```

In case you are applying tag defaults to compartments, the following permissions are required:
```
Allow group <group> to manage tag-defaults in compartment <tag_default_compartment_name>
Allow group <group> to use tag-namespaces in compartment <tag_namespace_compartment_name>
Allow group <group> to inspect tag-namespaces in tenancy
```

- *\<tag_default_compartment_name\>* is the compartment where the tag default is applied.
- *\<tag_namespace_compartment_name\>* is the compartment where the tag namespace is available.
  
  &nbsp; 

### **2.2 For the groups identity module**

This module requires the following OCI IAM permission:

```
Allow group <group> to manage groups in tenancy
```
&nbsp; 

### **2.3  For the dynamic-groups identity module**

This module requires the following OCI IAM permission:
```
Allow group <group> to manage dynamic-groups in tenancy
```

&nbsp; 

### **2.4 For the policies identity modules**

This module requires the following OCI IAM permissions in the top-most compartment that policies get attached to.
```
Allow group <group> to manage policies in compartment <compartment_name>
```
If the top-most compartment is the root compartment, the permission becomes:
```
Allow group <group> to manage policies in tenancy
```

&nbsp; 

### **2.5 For the networking module**

```
Allow group <group-name> to manage virtual-network-family in compartment <compartment-name>

Allow group <group-name> to manage drgs in compartment <compartment-name>
```

&nbsp; 

### **2.6 Terraform Version < 1.3.x and Optional Object Type Attributes**

This module relies on [Terraform Optional Object Type Attributes feature](https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes), which is experimental from Terraform 0.14.x to 1.2.x. It shortens the amount of input values in complex object types, by having Terraform automatically inserting a default value for any missing optional attributes. The feature has been promoted and it is no longer experimental in Terraform 1.3.x.

Upon running *terraform plan* with Terraform versions prior to 1.3.x, Terraform displays the following warning:
```
Warning: Experimental feature "module_variable_optional_attrs" is active
```

Note the warning is harmless. The code has been tested with Terraform 1.3.x and the implementation is fully compatible.

If you really want to use Terraform 1.3.x, in [providers.tf](./providers.tf):
1. Change the Terraform version requirement to:

```
required_version = ">= 1.3.0"
```

2. Remove the line:

```
experiments = [module_variable_optional_attrs]
```

&nbsp; 

## **3. How to Invoke the Module**

Terraform modules can be invoked locally or remotely. 

For invoking the module locally, just set the module *source* attribute to the module file path (relative path works). The following example assumes the module is two folders up in the file system.
```
module "terraform-oci-open-lz" {
  source = "../.."
  compartments_configuration   = var.compartments_configuration
  groups_configuration         = var.groups_configuration
  dynamic_groups_configuration = var.dynamic_groups_configuration
  policies_configuration       = var.policies_configuration
  network_configuration        = var.network_configuration
}
```

For invoking the module remotely, set the module *source* attribute to the networking module repository, as shown:
```
module "terraform-oci-open-lz" {
  source = "git@github.com:oracle-quickstart/terraform-oci-open-lz.git"
  compartments_configuration   = var.compartments_configuration
  groups_configuration         = var.groups_configuration
  dynamic_groups_configuration = var.dynamic_groups_configuration
  policies_configuration       = var.policies_configuration
  network_configuration        = var.network_configuration
}
```
For referring to a specific module version, append *ref=\<version\>* to the *source* attribute value, as in:
```
  source = "git@github.com:oracle-quickstart/terraform-oci-open-lz.git?ref=v0.1.0"
```

&nbsp; 

## **4. How to Use the module**

The input parameters for the module can be divided into 3 categories, for which we recomend to create two different ```*.tfvars.*``` files:
 1. OCI REST API authentication information (secrets) - ```terraform.tfvars``` (HCL) or ```terraform.tfvars.json``` (JSON):
    - ```tenancy_ocid```
    - ```user_ocid```
    - ```fingerprint```
    - ```private_key_path```
    - ```region```
 2. Identity configuration single complex type: ```open_lz_shared_identity.auto.tfvars``` (HCL) or ```open_lz_shared_identity.auto.tfvars.json``` (JSON). This configuration will cover 4 input variables:
    - ```compartments_configuration``` &ndash; For complete documentation of configuring the ```compartments_configuration``` input variable please refer to the terraform-oci-cis-landing-zone-iam/compartments Terraform module [documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/compartments/README.md).
    - ```groups_configuration``` &ndash; For complete documentation of configuring the ```groups_configuration``` input variable please refer to the terraform-oci-cis-landing-zone-iam/groups Terraform module [documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/groups/README.md).
    - ```dynamic_groups_configuration``` &ndash; For complete documentation of configuring the ```dynamic_groups_configuration``` input variable please refer to the terraform-oci-cis-landing-zone-iam/dynamic-groups Terraform module [documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/dynamic-groups/README.md).
    - ```policies_configuration``` &ndash; For complete documentation of configuring the ```policies_configuration``` input variable please refer to the terraform-oci-cis-landing-zone-iam/dynamic-groups Terraform module [documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam/blob/main/policies/README.md).



 3. Network configuration single complex type: ```network_configuration.auto.tfvars``` (HCL) or ```network_configuration.auto.tfvars.json``` (JSON):
    - ```network_configuration```:

        The ```network_configuration``` complex type can accept any new networking topology together or separated with injecting resources into existing networking topologies, and all those can map on any compartments topology.
    
        The ```network_configuration``` complex type fully supports optional attributes as long as they do not break any dependency imposed by OCI.

        For complete documentation of configuring the ```network_configuration``` input variable please refer to the terraform-oci-cis-landing-zone-networking Terraform module [documentation](https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking#how-to-use-the-module).

&nbsp; 

## **5. Using the Module with ORM**

Refer to the examples presented on the [OCI Open LZ Runtime View](/examples/oci-open-lz/readme.md).

For an ad-hoc use where you can select your resources, follow these guidelines:
1. [![Deploy_To_OCI](../images/DeployToOCI.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/terraform-oci-open-lz/archive/refs/heads/master.zip)
2. Accept terms,  wait for the configuration to load. 
3. Set the working directory to “orm-facade”. 
4. Set the stack name you prefer.
5. Set the terraform version to 1.2.x. Click Next. 
6. Add your json/yaml configuration files. Click Next.
8. Un-check run apply. Click Create.


&nbsp; 

## **6. Related Documentation**

- OCI IAM Compartments:
    - [Account and Access Concepts](https://docs.oracle.com/en-us/iaas/Content/GSG/Concepts/concepts-account.htm#concepts-access)
    - [Managing Compartments](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingcompartments.htm)
    - [Compartments in Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/identity_compartment)
    - [Managing Tag Defaults](https://docs.oracle.com/en-us/iaas/Content/Tagging/Tasks/managingtagdefaults.htm)
    - [Tag Defaults in Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/identity_tag_default)
- OCI IAM Groups:
    - [Managing Groups](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managinggroups.htm)
    - [Groups in Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/identity_group)
- OCI IAM Dynamic Groups:
    - [Managing Dynamic Groups](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingdynamicgroups.htm)
    - [Dynamic Groups in Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/identity_dynamic_group)
- OCI IAM Policies:
    - [Getting Started with OCI Policies](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policygetstarted.htm)
    - [How Policies Work](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policies.htm)
    - [Advanced Policy Features](https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policyadvancedfeatures.htm)
    - [Policies in Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/4.112.0/docs/resources/identity_policy)
- OCI Networking:
    - [OCI Networking Overview](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/overview.htm)

&nbsp; 

## **7. Contributing**
See [CONTRIBUTING.md](./CONTRIBUTING.md).

&nbsp; 

## **8. License**
Copyright (c) 2023, Oracle and/or its affiliates.

Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

See [LICENSE](./LICENSE) for more details.

&nbsp; 

## **9. Known Issues**

None.
