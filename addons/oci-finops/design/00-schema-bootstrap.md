# Module 00 — Schema bootstrap and access

## Purpose

Define the database identities and access boundaries of the platform inside an existing Autonomous Database. The design separates database administration, ownership of platform objects and read access for OAC.

## Database users

| User | Origin | Responsibility |
| --- | --- | --- |
| [ADMIN](#admin--resource-principal-credential) | Existing ADB account | Database administration and ownership of the Resource Principal credential. |
| [FOCUSPLATFORM](#focusplatform--owner-privileges) | Created by Module 00 | Owns the platform's database objects and executes its processing modules. |
| [OAC_FOCUS_READER](#oac_focus_reader--reporting-access) | Created by Module 00 | Authenticates the OAC connection and reads the platform data. |

## Created objects and access

### ADMIN — Resource Principal credential

The credential `ADMIN.OCI$RESOURCE_PRINCIPAL` represents the ADB identity for authentication to OCI services. It belongs to `ADMIN`; the platform owner receives access to use it without receiving administrative control of the account.

### FOCUSPLATFORM — owner privileges

All grants and configuration in this table apply to `FOCUSPLATFORM`.

| Grant or configuration | Privilege type | Purpose |
| --- | --- | --- |
| `CONNECT`, `DWROLE` | Roles | Database connection and ADB data warehouse capabilities. |
| Unlimited quota on `DATA` | User quota | Storage for platform tables, indexes and materialized views. |
| `EXECUTE ON DBMS_CLOUD` | Direct object grant | Cloud data access and loading from stored procedures. |
| `READ, WRITE ON DIRECTORY DATA_PUMP_DIR` | Direct directory grants | Log and bad files used by `COPY_DATA` remediation. |
| `EXECUTE ON DBMS_CLOUD_NOTIFICATION` | Direct object grant | Publishing operational reports through OCI Notifications. |
| `EXECUTE ON DBMS_LOCK` | Direct object grant | Serialization of coordinator and worker execution. |
| `SELECT ON SYS.V_$SESSION` | Direct object grant | Session-state checks during worker recovery. |
| `SELECT ON SYS.V_$PDBS` | Direct object grant | ADB identity and database-context checks. |
| `CREATE TABLE` | Direct system privilege | Supporting tables created by stored code. |
| `CREATE MATERIALIZED VIEW` | Direct system privilege | Versioned OAC reporting materialized views. |
| `CREATE SYNONYM` | Direct system privilege | Stable published name for the selected reporting MV. |
| `CREATE JOB` | Direct system privilege | Scheduler jobs created by definer-rights packages, including the initial-load stop helper. |
| Access to `ADMIN.OCI$RESOURCE_PRINCIPAL` | Resource Principal access, without delegation | Authentication to OCI services through the ADB identity, without delegation of that grant. |

Direct grants support definer-rights PL/SQL, where role privileges are disabled. In the database dictionary, the `DBMS_CLOUD` grant can appear under a versioned `DBMS_CLOUD$PDBCS...` implementation name.

### OAC_FOCUS_READER — reporting access

| Grant | Privilege type | Scope |
| --- | --- | --- |
| `CREATE SESSION` | Direct system privilege | Connect to ADB using the reader's own credentials. |
| `SELECT ANY TABLE ON SCHEMA FOCUSPLATFORM` | Schema-scoped privilege, without `ADMIN OPTION` | Read current and future platform tables, views and MVs, including internal tables. |

The reader receives no platform-owner roles, DDL privileges or Resource Principal grant from this module. Its database authorization covers the whole `FOCUSPLATFORM` schema; workbook filters do not narrow that authorization.

### Required execution paths

`FOCUSPLATFORM` also depends on the following ADB package execution paths.

| Required access | Access path |
| --- | --- |
| `EXECUTE` on `DBMS_CLOUD_PIPELINE` | An execution path through a direct grant, `DWROLE` or `PUBLIC`. |
| `EXECUTE` on `DBMS_MVIEW` | The public synonym resolves to `SYS.DBMS_SNAPSHOT`, with execution available to `PUBLIC` or `FOCUSPLATFORM`. |

Database Resource Principal access and OCI authorization are separate. The ADB's dynamic-group membership and source-specific policies are defined in the [OCI IAM prerequisites](../deployment/install/oci-resource-principal-iam.md).
