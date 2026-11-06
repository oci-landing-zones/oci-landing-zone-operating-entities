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
> Resource Principal access for the ADB to fetch FOCUS reports is already handled through dynamic group and policy configurations included in the OCI Landing Zone IAM setup.
> As these policies are already provisioned, make sure the variable `create_policy` remains set to `false` (which is the default).

For the ADB resource principal and reporting policy, use the final consolidated [`finops_iam.json`](../finops_iam.json) after replacing both its compartment and ADB OCID placeholders. Follow the [staged IAM setup and ownership migration](../../README.md#staged-iam-setup-and-existing-resource-ownership), supply the existing identity-domain dependency, and do not create duplicate resources with this Terraform example.
