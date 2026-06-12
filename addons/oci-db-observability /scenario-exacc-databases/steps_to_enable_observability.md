# OCI Observability Services for Exadata Cloud@Customer

Source: [exacc-observability-assets](https://github.com/oracle-devrel/technology-engineering/tree/DB_OBS/observability-and-management/database-observability/exacc-observability-assets)

This guide summarizes the source asset steps for enabling OCI Database Management, Operations Insights, and Logging Analytics for Exadata Cloud@Customer.

This document does not apply to Autonomous Clusters.

## Architecture

![Exadata Cloud@Customer observability architecture](https://raw.githubusercontent.com/oracle-devrel/technology-engineering/DB_OBS/observability-and-management/database-observability/exacc-observability-assets/files/image-1.png)

## Prerequisites

1. Decide whether to use an OCI Management Gateway.

   The Management Gateway is optional. Use it when the ExaCC server should not connect directly to OCI endpoints. An existing server can be used if it meets the required specifications.

2. Validate network connectivity.

   Open TCP port `4480` from the target server to the Cloud Management Gateway. This is the default port used by the source asset.

   Open TCP port `443` from the Cloud Management Gateway to these OCI endpoints in the selected region:

   ```text
   https://loganalytics.<OCI_REGION>.oci.oraclecloud.com
   https://operationsinsights.<OCI_REGION>.oci.oraclecloud.com
   https://auth.<OCI_REGION>.oci.oraclecloud.com
   https://telemetry-ingestion.<OCI_REGION>.oci.oraclecloud.com
   https://certificates.<OCI_REGION>.oci.oraclecloud.com
   https://certificatesmanagement.<OCI_REGION>.oci.oraclecloud.com
   https://management-agent.<OCI_REGION>.oci.oraclecloud.com
   ```

## IAM Policy Customization Considerations

The source asset provides reference policies for Database Management, Operations Insights, Logging Analytics, dashboards, alerts, Management Agent, secrets, certificates, vaults, and network access.

Review and customize the sample policies before production use based on:

- Compartment structure and resource ownership.
- Environment separation.
- Application or business-unit boundaries.
- Security, compliance, and segregation-of-duties requirements.
- Database administration and observability team responsibilities.

The `obs_admin` group may need compartment-scoped permissions instead of tenancy-wide permissions. Dynamic groups such as `obs_agent` and `Credential_Dynamic_Group` should also be reviewed so they grant only the minimum access needed.

## OCI Policies and Groups

Create or map these identities:

1. Observability administrator group: `obs_admin`.
2. Management Agent dynamic group: `obs_agent`.

   ```text
   ALL {resource.type='managementagent'}
   ```

3. Credential dynamic group: `Credential_Dynamic_Group`.

   ```text
   ALL {resource.type='certificateauthority'}
   ```

Configure policies for the following areas:

- Agent certificate, vault, and key access.
- OCI Database Management access.
- Operations Insights access.
- Logging Analytics access.
- Dashboard and alert access.

Use the full policy list from the source asset as the baseline and adjust tenancy-wide permissions to the target compartment model before deploying in production.

## Management Gateway Installation

Create a registration key in **Observability and Management** -> **Management Agents** -> **Download and Keys**.

Download the Management Gateway package from the OCI Console and install it on the gateway host.

```sh
sudo su -
cd /tmp/OM/
cat<<EOF>/tmp/OM/input.rsp
managementAgentInstallKey = <key you created above>
CredentialWalletPassword = <password>
EOF
chmod -R ugo+rw /tmp/OM/input.rsp
unzip oracle.mgmt_gateway.<version>.Linux-x86_64.zip
./installer.sh
sudo /opt/oracle/mgmt_agent/agent_inst/bin/setupGateway.sh opts=/tmp/OM/input.rsp
```

## Management Agent Installation

Install the Management Agent on each VM Cluster node.

```sh
sudo mkdir -p /devext/oracle/mgmt_agent
cat<<EOF>/devext/oracle/mgmt_agent/input.rsp
managementAgentInstallKey = <key you created above>
CredentialWalletPassword = <password>
GatewayServerHost = <gateway host>
GatewayServerPort = 4480
EOF
cd /devext/oracle/mgmt_agent
sudo ln -s /devext/oracle/mgmt_agent /opt/oracle/mgmt_agent

unzip oracle.mgmt_agent.<version>.Linux-x86_64.zip

sudo /bin/bash
export OPT_ORACLE_SYMLINK=true
./installer.sh ./input.rsp

usermod -a -G asmadmin mgmt_agent
usermod -a -G oinstall mgmt_agent
```

After the agent checks in, go to **Observability and Management** -> **Management Agent**. Open the agent menu and enable the Operations Insights, Database Management, and Logging Analytics plugins.

## Create the Monitor User

Create a monitoring user on each CDB.

Download `grantPrivileges.sql` from My Oracle Support Doc ID `2857604.1` and run it on the Container Database.

```text
sqlplus sys/<password>@(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=<host>.<domain>)(PORT=1521)))(CONNECT_DATA=(SERVICE=<CDB Servicename>))) as sysdba @grantPrivileges.sql C##OCI_MON_USER <password> N Y N> grantPrivileges.log
sqlplus sys/<password>@(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=<host>.<domain>)(PORT=1521)))(CONNECT_DATA=(SERVICE=<CDB Servicename>))) as sysdba @grantPrivileges.sql C##OCI_MON_USER <password> Y Y N> grantPrivileges.log
```

For each PDB/CDB, grant the required privileges.

```sql
ALTER SESSION SET CONTAINER=pdb1;
GRANT CREATE PROCEDURE to C##OCI_MON_USER;
GRANT SELECT ANY DICTIONARY, SELECT_CATALOG_ROLE to C##OCI_MON_USER;
GRANT ALTER SYSTEM to C##OCI_MON_USER;
GRANT ADVISOR to C##OCI_MON_USER;
GRANT EXECUTE ON DBMS_WORKLOAD_REPOSITORY to C##OCI_MON_USER;
```

Create a secret for the `C##OCI_MON_USER` password in **Identity & Security** -> **Key Management** -> **Secret Management**.

## Enable Database Management

Go to **Observability** -> **Database Management** -> **Administration** -> **Managed databases**.

Select the secret created for the monitoring user.

Register the CDB first, then repeat the process for each PDB.

## Enable Operations Insights

Go to **Observability** -> **Operations Insights** -> **Administration** -> **Exadata Fleet**.

Select **Cloud Infrastructure**, then select **ExaDB-C@C**.

Use the same credentials used for Database Management. Operations Insights will be enabled on all PDBs of the selected CDB.

## Enable Logging Analytics

Create the `mngt-log-group` log group in **Observability** -> **Logging Analytics** -> **Administration** -> **Log Group**.

Verify that the required properties exist for:

- Database Instance.
- Cluster Node.
- Listener.

Add missing properties if required.

Select the entity and choose the files to import.

Check the collection warning.

For first-time log ingestion, large directory errors can occur. If that happens, set the agent property on the Exa server and restart the agent.

```sh
tail -1 /opt/oracle/mgmt_agent/agent_inst/config/emd.properties
echo "loganalytics.enable_large_dir=true" >> /opt/oracle/mgmt_agent/agent_inst/config/emd.properties
systemctl stop mgmt_agent
systemctl start mgmt_agent
```
