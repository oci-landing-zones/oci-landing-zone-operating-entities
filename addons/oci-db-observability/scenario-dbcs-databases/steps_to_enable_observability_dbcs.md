# OCI Observability for OCI Native Database Deployments

This guide describes how to enable OCI observability capabilities for Oracle Base Database Service (DBCS). It covers Database Management, Operations Insights, and Logging Analytics.


## Prerequisites Already Created by the Landing Zone Add-on

The Observability Landing Zone add-on deployment already creates the prerequisites for Database Management, Operations Insights, and Logging Analytics. The exact resources depend on the selected deployment option:

- In OPTION 1. CENTRALIZED APPROACH, the add-on creates the centralized monitoring compartment `cmp-lz-monitoring`.
- In OPTION 2. PROJECT APPROACH, the add-on does not create monitoring compartments; it uses the existing project compartments `cmp-lz-prod-proj1` and `cmp-lz-preprod-proj1`.
- Monitoring groups. The centralized option creates `grp-lz-global-mon-admins` and `grp-lz-global-mon-reader`. The project option creates `grp-lz-prod-proj1-mon-admin`, `grp-lz-prod-proj1-mon-reader`, `grp-lz-preprod-proj1-mon-admin`, and `grp-lz-preprod-proj1-mon-reader`.
- The Management Agent dynamic group `id_lz_common/dg-lz-mon-dynamic-group` in the COMMON Identity Domain.
- IAM policies for Database Management, Operations Insights, Logging Analytics, dashboards, alerts, Management Agent, secrets, and the required network access.
- Network Security Groups for the DBM/OPSI private endpoint connectivity.
- Observability Vault and Key resources. The centralized option creates `vlt-lz-shared-mon-security` and `key-lz-mon-bkt`. The project option creates `vlt-lz-prod-mon-security` / `key-lz-prod-mon-bkt` in `cmp-lz-prod-security`, and `vlt-lz-preprod-mon-security` / `key-lz-preprod-mon-bkt` in `cmp-lz-preprod-security`.
- For Logging Analytics, a Service Gateway is required for database hosts to send logs to Logging Analytics. This is included in the One-OE project VCNs by default. If you are using a custom VCN, make sure a Service Gateway is configured.


## Manual Prerequisites

1. Create a monitoring user on each CDB.

   Download `grantPrivileges.sql` from My Oracle Support Doc ID `2857604.1` and run it on the Container Database.

   ```text
   sqlplus sys/<password>@(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=<host>.<domain>)(PORT=1521)))(CONNECT_DATA=(SERVICE=<CDB Servicename>))) as sysdba @grantPrivileges.sql C##OCI_MON_USER <password> N Y N> grantPrivileges.log
   sqlplus sys/<password>@(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=<host>.<domain>)(PORT=1521)))(CONNECT_DATA=(SERVICE=<CDB Servicename>))) as sysdba @grantPrivileges.sql C##OCI_MON_USER <password> Y Y N> grantPrivileges.log
   ```

2. For each PDB/CDB, grant the required privileges.

   ```sql
   ALTER SESSION SET CONTAINER=pdb1;
   GRANT CREATE PROCEDURE to C##OCI_MON_USER;
   GRANT SELECT ANY DICTIONARY, SELECT_CATALOG_ROLE to C##OCI_MON_USER;
   GRANT ALTER SYSTEM to C##OCI_MON_USER;
   GRANT ADVISOR to C##OCI_MON_USER;
   GRANT EXECUTE ON DBMS_WORKLOAD_REPOSITORY to C##OCI_MON_USER;
   ```

3. Create a secret for the `C##OCI_MON_USER` password in the Observability Vault created by the selected Observability Landing Zone add-on deployment option.

   In the OCI Console, go to **Identity & Security** -> **Key Management** -> **Secret Management**.

   For OPTION 1. CENTRALIZED APPROACH, use `vlt-lz-shared-mon-security`.

   For OPTION 2. PROJECT APPROACH, use the vault that matches the target database environment: `vlt-lz-prod-mon-security` for Prod databases, or `vlt-lz-preprod-mon-security` for Preprod databases.

   Create a secret for the `C##OCI_MON_USER` password.

4. Create the private endpoint for Database Management. Use the subnet and NSG model selected for the Observability Landing Zone add-on deployment.

   Go to **Observability & Management** -> **Database Management** -> **Administration** -> **Private Endpoint** -> **Create Endpoint**.

   If you are creating the private endpoint for a RAC database, select **Use private endpoint**.

5. Create the private endpoint for Operations Insights. Use the subnet and NSG model selected for the Observability Landing Zone add-on deployment.

   Go to **Observability & Management** -> **Operations Insights** -> **Administration** -> **Private Endpoint** -> **Create Endpoint**.

   Select **Use private endpoint**.

6. Verify connectivity between the target database and the private endpoint.

   The add-on creates the required NSGs for the selected centralized or project approach. Confirm the target database and service private endpoints use the expected subnet and NSG assignments, and verify that the private endpoint network can reach the target database listener on port `1521`.

## Enable Database Management for DBCS

For each database you want to enable:

Go to **Oracle Database** -> **Oracle Base Database** -> **DB Systems** -> **DB System Details** -> **Database Details**.

Select **Database Management** -> **Enable**.

If the Console displays an **Add Policy** prompt, these policies have already been deployed by the landing zone. Do not create duplicate policies unless the add-on deployment did not apply the required IAM configuration.

Enter the username and select the secret for the monitoring user created in the Manual Prerequisites section.

Select **Full Management** when full Database Management capabilities are required.

For each Pluggable Database, go to **Oracle Database** -> **Oracle Base Database** -> **DB Systems** -> **DB System Details** -> **Database Details** -> **Pluggable Database**.

To identify the PDB service name, use `lsnrctl status`.

## Enable Operations Insights for DBCS

Operations Insights can be enabled for DBCS, CDB, and PDB resources in a single flow.

Go to **Observability & Management** -> **Operations Insights** -> **Administration** -> **Add database**.

For DBCS, select **Bare metal, virtual machine**.

Enter the credentials created in the Manual Prerequisites section.

## Enable Logging Analytics for DBCS

DBCS logs contain information that should be included in a complete observability design. To analyze these logs in OCI Logging Analytics, push them into Logging Analytics. Follow this guide to install [OCI Management Agent](https://docs.oracle.com/en-us/iaas/management-agents/doc/install-management-agent-chapter.html) on database hosts.

After the agent checks in, go to **Observability and Management** -> **Management Agent**, open the three-dot menu, and enable the Logging Analytics plugin.

Create a Logging Analytics log group.

Go to **Observability and Management** -> **Logging Analytics** -> **Administration** -> **Log Group**.

Create a database entity.

Go to **Observability and Management** -> **Logging Analytics** -> **Administration** -> **Create Entity**.

To collect alert and trace logs, populate the `adr_home` property.

Go to **Observability and Management** -> **Logging Analytics** -> **Administration** -> **Add Data**.

Select **Custom Selection**.

Select the database entity created earlier.

Select **Database** and **Trace logs**.

Wait a few minutes, then open Log Explorer. The logs should appear there and can be analyzed.

&nbsp;

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
