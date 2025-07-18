# Autonomous Database Deployment via Terraform
This folder contains a reference Terraform script to provision the **Autonomous Database (ADB) with Private Endpoint** used by the FinOps platform.

Use the **compartment**, **VCN**, and **subnet OCIDs** that were previously created as part of your OCI Landing Zone deployment.
Rename the **terraform.tfvars.example** to **terraform.tfvars** and input the required values.
Run the following terraform commands to create the resources. 

The default value for the variable **adw_db_name** in the terraform code is **FINOPS**. 
If you already have a DB with that name in your tenancy please give a different name.

The default value for the variable **create_policy** is **false**.

```
terraform init
terraform plan
terraform apply -auto-approve
```


> [!NOTE] 
> Instance Principal access for the ADB to fetch FOCUS reports is already handled through dynamic group and policy configurations included in the OCI Landing Zone IAM setup.  
> As these policies are already provisioned, make sure the variable `create_policy` remains set to `false` (which is the default).

For policy details, refer to [`policies.md`](/addons/oci-finops/finops-setup/policies.md).
