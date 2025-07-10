# OCI FinOps Setup Guide

### 🚀 Pre-requisite

To deploy the OCI FinOps addon, it is recommended to start with an Oracle-supported Landing Zone such as a [CIS landing zone](https://github.com/oci-landing-zones/oci-cis-landingzone-quickstart), [OCI Core Landing Zone](https://github.com/oci-landing-zones/terraform-oci-core-landingzone) or [Multi-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-oe/generic_v1/runtime).  

The design follows the implementation on top of the [**One-OE Landing Zone**](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack) blueprint, with the FinOps solution hosted in the **platform layer**.

> ℹ️ **Note:**  
> Refer to the following files for One-OE Landing Zone IAM & networking configurations:

- [`finops_iam.auto.tfvars.json`](./finops_iam.auto.tfvars.json): Sample template for IAM configuration including **compartments**, **groups**, and **policies** required for the FinOps addon. You can customize this configuration to align with your OCI IAM topology.
- [`finops_network.auto.tfvars.json`](./finops_network.auto.tfvars.json): Complete networking configuration template to support the FinOps platform within the **One-OE** blueprint. You can modify it to meet your network design needs.

> ⚠️ **Important:**  
> The `finops_network.auto.tfvars.json` template is designed for the **Hub-and-Spoke (HUB-E)** network model.  
> Refer to the [HUB firewall models](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models) for more information on supported deployment options.

&nbsp;

# Step 1: Create Autonomous database and required policies using Terraform Script
Please choose a strong ADMIN password for Autonomous Data Warehouse (ADW) and store it in OCI Secret.
Please refer the [doc](https://docs.oracle.com/en-us/iaas/finops-setup/KeyManagement/Tasks/managingsecrets_topic-To_create_a_new_secret.htm) to create secret in OCI. 
This is required if you are using the example terraform script provided to avoid writing passwords in the terraform state file.
You can run the terraform script using OCI Cloudshell 

You can also create autonomous database and policies manually via OCI console as well.

Example [Terraform script](/addons/oci-finops/finops-setup/terraform/) is provided to create the resources
- Autonomous Data Warehouse (ADW) [Reference](https://docs.oracle.com/en/cloud/paas/autonomous-database/index.html)


Rename the terraform.tfvars.example to terraform.tfvars and input the required values.
Run the following terraform commands to create the resources. 

The default value for the variable **adw_db_name** in the terraform code is **FINOPS**. 
If you already have a DB with that name in your tenancy please give a different name.

The default value for the variable **create_policy** is **false**.
The policies and dynamic group needs to be created at the root compartment .If the user running the terraform script have the required privilege set the **create_policy** variable  to **true** in terraform.tfvars
```
terraform init
terraform plan
terraform apply -auto-approve
```

# Step 2: Add the required IAM policies(Optional)
If you have to create the policies and dynamic group manually

Refer the [policies.md](/addons/oci-finops/finops-setup/policies.md) for examples.

# Step 3: Connect to ADW and Run SQL Scripts
### Step 3.1: Connect to ADW
Connect to the ADW using [SQL worksheet](https://docs.oracle.com/en-us/iaas/database-tools/doc/run-sql-statement-sql-worksheet.html) available in OCI  or other SQL client tools.


### Step 3.2: Run SQL Scripts as ADMIN User
[Resource Principal](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/resource-principal.html) is used to give access for the autonomous database. 


Run the following SQL scripts [admin.sql](/addons/oci-finops/finops-setup/sql/admin.sql) using the ADMIN user.

### Step 3.3: Run SQL Scripts as FINOPS User

Run the SQL scripts provided in [finopsuser.sql](/addons/oci-finops/finops-setup/sql/finopsuser.sql) using the newly created FINOPS user:

[DBMS_CLOUD_PIPELINE](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/autonomous-pipeline.html) is used to load data from objectstorage into the autonomous database. 

**Note:** Replace the objectstorage url with your region objectstorage URL ,tenancy ocid and year in the placeholder in line number 71 for the set_attribute. 

This is used to ingest all the previous and upcoming FOCUS reports of your tenancy into ADW for that year. If you have more old files to load scale the ADW so the pipeline will run faster for the initial load and you can scale it down later.

Example: "https://objectstorage.eu-frankfurt-1.oraclecloud.com/n/bling/b/ocid1.tenancy.../o/FOCUS Reports/2025". 

This will download all the previous reports for the year 2025 and also the new reports getting generated for that year later.

The interval for the dbms_cloud_pipeline is set to 60 minutes in finopsuser.sql. 


By following these steps, you should be able to successfully deploy the FINOPS solution which will ingest FOCUS reports into Autonomous database automatically.

**NOTE:** This solution has been tested with Autonomous Database 23ai version for the FOCUS 1.0 specification .