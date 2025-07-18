# Autonomous Database Deployment via Terraform
This folder contains a reference Terraform script to provision the **Autonomous Database (ADB) with Private Endpoint** used by the FinOps platform.

Use the **compartment**, **VCN**, and **subnet OCIDs** that were previously created as part of your OCI Landing Zone deployment.

> [!NOTE] 
> Instance Principal access for the ADB to fetch FOCUS reports is already handled through dynamic group and policy configurations included in the OCI Landing Zone IAM setup.  
> As these policies are already provisioned, make sure the variable `create_policy` remains set to `false` (which is the default).

For policy details, refer to [`policies.md`](/addons/oci-finops/finops-setup/policies.md).
