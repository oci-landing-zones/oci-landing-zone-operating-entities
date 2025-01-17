# **OCI LZ Orchestrator Upgrade process**

## **Table of Contents**

[1. Introduction](#1-introduction)</br>
[2. Upgrading configuration](#2-upgrading-configuration)</br>
[3. How to upgrade the configuration with Terraform CLI](#3-how-to-upgrade-the-configuration-with-terraform-cli)</br>
[4. How to upgrade existing OCI Resource Manager stacks](#4-how-to-upgrade-existing-oci-resource-manager-stacks) </br>

&nbsp; 

## **1. Introduction.**

The OCI LZ orchestrator is a major change, bringing new capabilities as the possibility to create configurations for new Networking (Network Load Balancer), Monitoring, Security, Governance, and other OCI services. It also includes some great changes to manage dependencies between operations in external locations, as files/object storage buckets, and some other features as being able to auto-detect home region for IAM resources provisioning.

Because some of these new features, some variables has been updated.

This document is intended to guide any user with existing configurations of previous versions of the OCI LZ orchestrator to update their configs and orchestrator code. In this way you will be able to keep receiving orchestrator updates that might fix previous bugs and will unlock the capabilities to unlock the management of the services of your interest for the LZ withing the same configuration approach.

&nbsp; 

## **2. Upgrading configuration.**

### **2.1. Changes in credentials file.**

The argument *home_region* in the *oci-credentials.tfvars.json* has been replaced by the argument *region*. 

Now it is more comprenhensible and also offers the capability to use the region to any secondary region that you want to provision resources to. It doesn't matter if you're provisioning IAM resources also and this is not your home region, as now the orchestrator will detect your OCI home region and will provision the IAM resources there, while the rest of the resources defined in your configuration will be provisioned in the indicated region.

To perform the change, replace in your credentials files (*oci-credentials.tfvars.json*), the *home_region* by *region* and plan/apply with the new orchestrator code. Review carefully the changes to be done in your configuration. It should just be a rename, nothing should be destroyed or recreated.

Summary of the change:

| Variable | New Variable | File |
|---|---|---|
| home_region | region | oci-credentials.tfvars.json |

&nbsp; 

### **2.2. Changes in the IAM Policies Module.**

The argument to attach the IAM Policy to a compartment, the *compartment_ocid* has changed for *compartment_id* in the IAM Policies Module.

| Variable | Old Argument | New argument | File |
|---|---|---|---|
| policies_configuration | compartment_ocid | compartment_id | *identity.auto.tfvars.json |

&nbsp; 

### **2.3. General changes referencing compartments with OCIDs/Keys in the networking module.**

The networking module has some dependencies in the compartments module. To being able to reference the compartments, we have the possibility to reference the compartments by OCID (**compartment_id*) or by key (**compartment_key*). The reference to keys has been removed and now, the same argument accepts a key created in the same operation, and OCID or and external key.

To perform the change, replace in your network_configuration variable defined in your files (*network.auto.tfvars.json*), the **compartment_key* by **compartment_id* and plan/apply with the new orchestrator code. Review carefully the changes to be done in your configuration. It should just be a rename, nothing should be destroyed or recreated.

Summary of the change:

| Variable | Old Argument | New argument | File |
|---|---|---|---|
| network_configuration | default_compartment_key | default_compartment_id | *network.auto.tfvars.json |
| network_configuration | category_compartment_key | category_compartment_id | *network.auto.tfvars.json |
| network_configuration | compartment_key | compartment_id | *network.auto.tfvars.json |

&nbsp; 

### **2.4. Modules renaming.**

The Terraform core modules used by the new orchestrator (>v2.0) has changed their names with a common name convention. However, a mechanisism has been introduced in the code to rename in the terraform state file the resources created with the old orchestrator with the new names.

You might see the first time you run the new orchestrator some messages indicating that one module is going to be renamed with a new name in an update-in-place operation. Don't be scared with that as it is expected.

Here you have a list with the old module name and the new one:

| Old module name | New module name |
|---|---|
| cislz_compartments | oci_lz_compartments |
| cislz_groups | oci_lz_groups |
| cislz_dynamic_groups | oci_lz_dynamic_groups |
| cislz_policies | oci_lz_policies |
| terraform-oci-cis-landing-zone-network | oci_lz_network |

The kind of messages expected to see in the plan/apply are like these:

```
  # module.terraform-oci-open-lz.module.terraform-oci-cis-landing-zone-network.module.l7_load_balancers.oci_load_balancer_backend.these["SHARED-LB-BCK-END-SET-01-BE-01""] has moved to module.oci_lz_orchestrator.module.oci_lz_network[0].module.l7_load_balancers.oci_load_balancer_backend.these[""SHARED-LB-BCK-END-SET-01-BE-01"]
    (...)
```

&nbsp; 

## **3. How to upgrade the configuration with Terraform CLI.**

Once you've updated your JSON configuration files, you need to update the configuration in your state file.

Clone the new version of the repository, initialize the configuration to download the dependent Terraform core modules and you're ready to run your plan/apply.

To clone the repository do:

```
git clone git@github.com:oracle-quickstart/terraform-oci-landing-zones-orchestrator.git
```

Cloning the latest version:
```
git clone git@github.com:oracle-quickstart/terraform-oci-landing-zones-orchestrator.git
```

For referring to a specific module version, append *ref=\<version\>* to the *source* attribute value. 

E.g.: 
```
git clone git@github.com:oracle-quickstart/terraform-oci-landing-zones-orchestrator.git?ref=v2.0.0
```

Initialize:

```terraform init```

Run ```terraform plan``` with the IAM and Network configuration.

```
terraform plan \
-var-file ../examples/oci-open-lz/op01_manage_shared_services/oci-credentials.tfvars.json \
-var-file ../examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_identity.auto.tfvars.json \
-var-file ../examples/oci-open-lz/op01_manage_shared_services/open_lz_shared_network.auto.tfvars.json \
-state ../examples/oci-open-lz/op01_manage_shared_services/terraform.tfstate
```

***NOTE: Pay attention to the plan output to check that none resources are going to be destroyed and re-created, as it should not.***

Run ```terraform apply``` with the IAM and Network configuration.

```
terraform apply \
-var-file <location to your credentials file>/oci-credentials.tfvars.json \
-var-file <location to your identity JSON file>/<identity>.auto.tfvars.json \
-var-file <location to your identity JSON file>/<network>.auto.tfvars.json \
-state <location to your identity JSON file>/terraform.tfstate
```

&nbsp; 

## **4. How to upgrade existing OCI Resource Manager stacks.**

There a couple of strategies to upgrade your existing OCI Resource Manager stacks:

1. **In-place upgrade**. The stack configuration is edited and the code is replaced with the new version. The configuration is updated in the external location. State file remains in the stack. 
   
2. **Out-of-place upgrade**. A new stack is created with the new orchestrator code. The configuration can be pointed to the same old location or a new one. You need to download the Terraform state file from the orinal stack and upload into the new one.

We'll just document here the in-place approach and all the steps indicated are executed in the OCI Console.

&nbsp; 

### **4.1. ORM stack in-place upgrade.**

#### **4.1.1. Backup**

This step is optional, but we encorage to you to do it just in case that an error arise during the upgrade and you need to restore part of the configuration, always that you haven't recreated some resources that might make the backup unusable.

Here you have the details to backup the different elements:

1. **Backup the Terraform code**. On your operation stack, locate the *Terraform configuration* and click on *Download*, save in a folder in your computer.
   
2. **Backup the Terraform state file**. On your operation stack, click on the *More actions* button and click on the *Download Terraform state*, save in a folder in your computer.
   
3. **Backup the Terraform configuration files**. On your operation stack, click on *Variables*, located in the left *Resources* pane. Check the variable called *input_config_files_urls* and access the HCL, JSON or YAML files for your Identity and/or Network configuration from your browser. These files can be located in different places based on your setup (public git repository, Object Storage or others). Save in a folder in your computer.

&nbsp; 

#### **4.1.2. Edit the ORM stack configuration.**

To update the configuration, follow these steps:

1. **Download the new orchestrator**. Access [this](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/heads/main.zip) link and download in the new repository contents in your computer.
   
2. **Edit the stack**. On your stack, click on the *Edit* button and click on *Edit stack*. 
   * ***Stack information section***:
     * Drop the zip file that you've just downloaded in the *Drop a .zip file* rectangle.
     * In the *Working directory*, select the *terraform-oci-landing-zones-orchestrator-main/rms-facade*.
     * In the *Terraform version* dropdown list, select the "1.5.x" version. Confirm clicking in *Yes* button the Terraform version change dialog box when appears. This step should look like this:
    ![ORM-Stack-information](/commons/images/ORM-Stack-information.jpg)
     * Click *Next*.
   * ***Configure variables section***:
     * **Region**. Check that the region is the same as where you have the resources for this stack (might be different to where the stacks belongs.).
     * **Configuration source**. Select the source for your configuration files. If you were using before a public git repo or a public or pre-authenticated OCI Object Storage bucket, select *url*. Now you have the option to use private GitHub repos or private buckets. If you're planning to change to one of these repositories for your configuration, we recommend to do it in a second phase after everything is working fine with the new code to reduced the risks in the process.
     * **URL Sources**. Check that the URL Sources are correct for your existing configuration.
     * **Dependency Files**. The feature is new and optional. It is used to store a JSON files with the keys and OCIDs of some resources created in a previous operation (stack) so they can be used in this operation (stack). As with the configuration sources, we encorage to start using this feature after the upgrade of the previous orchestrator version. This step should look like this:
    ![ORM-Configure-variables](/commons/images/ORM-Configure-variables.jpg)
     * Click *Next*.
   * ***Review section***:
     * Just review that the stack information and the variables are correct, ensure that the *Run apply* is unmatched. This step should look like this:
    ![ORM-Review](/commons/images/ORM-Review.jpg)
     * Click *Next*.

3. **Update the configuration files**. Ensure that you followed the section [2. Upgrading configuration](#2-upgrading-configuration) in this document and you uploaded the updated configuration files in the location configured in the stack (GitHub, OSS, other.).
   
4. **Run the plan**. Just click on the *Plan* button in the stack. ***Pay LOT of attention to the output of the plan***. You should just see some changes in some freeform_tags that are being introduced with the version of the Terraform code module used (not any destruction/creation of resources). You also would be able to see the modules renaming mentioned in the section 2.4.

5. **Run the apply**. Just click on the *Apply* button in the stack. You should just see some changes in some freeform_tags that are being introduced with the version of the Terraform code module used (not any destruction/creation of resources). You also would be able to see the modules renaming mentioned in the section 2.4. Once performed this step, you'll be running the new code and updated configuration. Modify any other stack/operation using old orchestrator version, to have full coherence in your infrastructure.


&nbsp; 

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
