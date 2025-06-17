# Prerequisites
Please choose a strong ADMIN password for Autonomous Data Warehouse (ADW) and store it in OCI Secret. Please refer the [doc](https://docs.oracle.com/en-us/iaas/Content/KeyManagement/Tasks/managingsecrets_topic-To_create_a_new_secret.htm) to create secret in OCI. 

Make sure the required policies are in place with least privileges

# Step 1: Create Temporary Auth Token for OCIR Registry
Create a temporary [Auth token](https://docs.oracle.com/en-us/iaas/Content/Registry/Tasks/registrygettingauthtoken.htm) for pushing images to OCIR registry for the identity user.

**Note:** Delete the Auth token after successful creation of resources.

# Step 2: Create Resources using Terraform Script
If you are running the terraform script locally you need to have docker up and running.

You can also run the terraform script in OCI Cloudshell where docker is preinstalled. In Cloudshell make sure you have enough disk space in the home directory for creating docker images.

Use the provided [Terraform script](/addons/oci-finops/content/terraform/) or [RMS stack](<>) to create the necessary resources, including:
- OCI Resource Scheduler [Reference](https://docs.oracle.com/en-us/iaas/Content/resource-scheduler/home.htm)
- OCI Function [Reference](https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionsquickstartguidestop.htm)
- Autonomous Data Warehouse (ADW) [Reference](https://docs.oracle.com/en/cloud/paas/autonomous-database/index.html)

# Step 3: Connect to ADW and Run SQL Scripts
### Step 3.1: Connect to ADW
Connect to the ADW using SQL Worksheet available in OCI [SQL worksheet](https://docs.oracle.com/en-us/iaas/database-tools/doc/run-sql-statement-sql-worksheet.html) or other SQL client tools.


### Step 3.2: Run SQL Scripts as ADMIN User
[Resource Principal](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/resource-principal.html) is used to give access for the autonomous database. 

You have to add the required IAM policies before running the script.

Run the following SQL scripts [admin.sql](/addons/oci-finops/content/sql/admin.sql) using the ADMIN user.

### Step 3.3: Run SQL Scripts as FINOPS User
Run the following SQL scripts [finopsuser.sql](/addons/oci-finops/content/sql/finopsuser.sql) using the newly created FINOPS user:

**Note:** Replace the objectstorage url with yours in line number 71 for the set_attribute

[DBMS_CLOUD_PIPELINE](https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/autonomous-pipeline.html) is used to load data from objectstorage into the autonomous database. 

The interval for the dbms_cloud_pipeline is set to 5 minutes in finopsuser.sql.


# Post-Deployment Steps
1. Verify that the resources have been created successfully.
2. Invoke the function to check its downloading the OCI FOCUS reports into the respective object storage bucket
and its loaded into ADW after 5 minutes .
3. Delete the temporary Auth token created in Step 1.
4. You can set lifecycle policy rules in the object storage bucket to delete files after couple of days to save objectstorage cost.
5. The resource scheduler is set to run everyday at 11.30PM UTC. This can be modified to run frequently like every 6hours if needed. 

By following these steps, you should be able to successfully deploy the FINOPS solution which will download yesterday FOCUS reports and load into Autonomous database.