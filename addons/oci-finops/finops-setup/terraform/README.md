# Autonomous Database Deployment via Terraform
This folder contains a reference Terraform script to provision the **Autonomous Database (ADB) with Private Endpoint** used by the FinOps platform.

Use the **compartment**, **VCN**, and **subnet OCIDs** that were previously created as part of your OCI Landing Zone deployment.
Rename the **terraform.tfvars.example** to **terraform.tfvars** and input the required values.
Run the following terraform commands to create the resources. 

The default value for the variable **adw_db_name** in the terraform code is **FINOPS**. 
If you already have a DB with that name in your tenancy please give a different name.

The default value for the variable **create_policy** is **false**.

Automatic FinOps tags are enabled by default (`enable_cost_governance_tags = true`), preserving the published behavior. Deploy the `tagns-lz-cost-governance` namespace and its six key definitions before this configuration. Published governance Tag Defaults use `is_user_required: false`; the namespace and keys are still prerequisites. Customer values must satisfy the deployed definitions.

For a Studio landing zone with FinOps tags disabled, set:

```hcl
enable_cost_governance_tags = false
defined_tags                = {}
```

This omits automatic FinOps tags on the database and any dynamic group or policy created by this configuration. Explicit `defined_tags` and `database_defined_tags` are always preserved, including any FinOps entries supplied by the caller; their namespaces and keys must already exist. When automatic tags are enabled, customer values override their defaults, except that the database Platform is always `finops`.

For customer mappings with tags enabled, use the [standalone tag adapter](../README.md#apply-customer-tag-mappings-consistently) to derive IAM, network and ADB inputs from one design. Place its `finops_adb.auto.tfvars.json` beside this Terraform configuration and supply the remaining required variables separately. `defined_tags` applies to the database and optional IAM resources; `database_defined_tags` overrides those values only for the database. This supports different cost centers for IAM and ADB using the same design rules. Its default is `{}`, preserving existing behavior. With automatic tags enabled, the database Platform remains `finops` after both maps are merged.

This option applies only to this Terraform configuration. Prepare separate adapted copies of the Step 1 IAM and network inputs using [FinOps tags and Studio compatibility](../../../readme.md#finops-tags-and-studio-compatibility). It does not change the published JSON inputs or create a missing namespace. Review plans carefully before changing the option on an existing deployment, because it changes the managed tags.

```
terraform init
terraform plan
terraform apply -auto-approve
```


> [!NOTE] 
> Instance Principal access for the ADB to fetch FOCUS reports is already handled through dynamic group and policy configurations included in the OCI Landing Zone IAM setup.  
> As these policies are already provisioned, make sure the variable `create_policy` remains set to `false` (which is the default).

For policy details, refer to [`policies.md`](/addons/oci-finops/finops-setup/policies.md).
