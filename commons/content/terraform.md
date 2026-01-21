# Run with Terraform CLI <!-- omit from toc -->

## **Table of Contents** <!-- omit from toc -->
- [**1 Setup Terraform Authentication**](#1-setup-terraform-authentication)
- [**2 Clone this Git repo to your Machine**](#2-clone-this-git-repo-to-your-machine)
- [**3 Clone the orchestrator Git repo to your Machine**](#3-clone-the-orchestrator-git-repo-to-your-machine)
- [**4 Change the Directory to the Terraform Orchestrator Module**](#4-change-the-directory-to-the-terraform-orchestrator-module)
- [**5 Run ```terraform init```**](#5-run-terraform-init)
- [**6 Run ```terraform plan```**](#6-run-terraform-plan)
- [**7 Run ```terraform apply```**](#7-run-terraform-apply)




### **1 Setup Terraform Authentication**
For authenticating against the OCI tenancy terraform execute the following [instructions](/commons/content/terraform_authentication.md).
### **2 Clone this Git repo to your Machine**
```
git clone git@github.com:oci-landing-zones/oci-landing-zone-operating-entities.git
```
### **3 Clone the orchestrator Git repo to your Machine**
Cloning the latest version:
```
git clone git@github.com:oci-landing-zones/terraform-oci-modules-orchestrator.git
```
###  **4 Change the Directory to the Terraform Orchestrator Module**
Change the directory to the *terraform-oci-landing-zones-orchestrator* Terraform orchestrator module.
### **5 Run ```terraform init```**
Run ```terraform init``` to download all the required external terraform providers and Terraform modules.
### **6 Run ```terraform plan```**
Run ```terraform plan``` with the required configuration files specified using `-var-file`.
```
terraform plan \
-var-file ../oci-landing-zone-operating-entities/commons/content/oci-credentials.tfvars.json \
-var-file ../oci-landing-zone-operating-entities/... \
-var-file ../oci-landing-zone-operating-entities/... \
-var-file ../oci-landing-zone-operating-entities/... \

```

After the execution please analyze the output of the command above and check if it corresponds to your desired configuration.

Note that the ```terraform.tfstate``` file is generated in the configuration location and not in the terraform code location. This is the expected configuration as the terraform automation can support any number of configurations and the **state file** will belong to the configuration and not to the code.
  
The ideal scenario regarding the **state file** will be for each configuration to have a corresponding OCI Object Storage location for the state file. For more details on the Terraform state file recommended configuration please refer to the following [documentation](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/terraformUsingObjectStore.htm).

&nbsp;

### **7 Run ```terraform apply```**
Run terraform plan with the required configuration files specified using `-var-file`. After its execution the configured resources will be provisioned or updated on OCI.
```
terraform apply \
-var-file ../oci-landing-zone-operating-entities/commons/content/oci-credentials.tfvars.json \
-var-file ../oci-landing-zone-operating-entities/... \
-var-file ../oci-landing-zone-operating-entities/... \
-var-file ../oci-landing-zone-operating-entities/... \
```

&nbsp;
&nbsp; 

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
