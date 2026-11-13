# Onboard users to the FOCUSPLATFORM OAC workbook

Give authenticated viewers access to the [imported workbook](oac-workbook-import.md), its datasets and its existing connection. Prepare shared content once; repeat identity/group onboarding and verification for each viewer.

## Contents

- [Prerequisites](#prerequisites)
- [1. Add the user to the consumer group](#1-add-the-user-to-the-consumer-group)
- [2. Assign the consumer role](#2-assign-the-consumer-role)
- [3. Share the workbook and dependencies](#3-share-the-workbook-and-dependencies)
- [Verify access](#verify-access)
- [Troubleshooting](#troubleshooting)
- [Change or remove access](#change-or-remove-access)

## Prerequisites

- OAC, its user network path and the imported workbook's ADB connection work.
- Identify the instance's actual identity domain, approved consumer group, team folder, workbook, datasets and connection.
- Identity administration, OAC role administration and content ownership may require different administrators.

A viewer needs an identity, an OAC consumer role and access to the reporting objects. OCI service-management IAM policies and ADB Resource Principal policies do not provide those permissions. Viewers do not need a new database user, wallet or installer privileges.

## 1. Add the user to the consumer group

1. In OCI Console, open **Identity & Security → Domains → the OAC-associated domain → Users**. Find the exact sign-in name and confirm the account is active.
2. If absent, provision it through the organization's identity process. For federated users, use the source identity provider rather than creating a duplicate account.
3. Under **Groups**, add the user to the approved consumer group. Confirm they can sign in to the intended OAC URL.

See Oracle's [identity-domain setup](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/use-identity-domains-users-groups.html).

## 2. Assign the consumer role

1. As an OAC administrator, open **Navigator → Console → Roles and Permissions → Application Roles**.
2. Select **BI Consumer → Members → Groups → Add Groups**. Add the approved group if it is not already present.
3. Decide the reporting audience:
   - **All BI consumers:** use `BIConsumer` in the reporting objects' access lists.
   - **FinOps-only audience:** create a dedicated application role, such as `FinOps Workbook Viewer`, with **None** for initial application permissions, then add the same group under **Members → Groups**. The BI Consumer assignment provides viewing capability; use the dedicated role in object access lists and remove unintended broad grants.
4. Confirm effective membership. Under **Roles and Permissions → Users → the user → Application Roles**, use **Show Indirect Assignments** to include group-inherited roles.

Do not add author or administrator rights to fix viewer access. Identity-domain application roles such as ServiceViewer, ServiceUser and ServiceAdministrator are mapped to OAC roles; verify the effective result. See Oracle's [group assignments](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/assign-application-roles-groups.html) and [custom roles](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/add-your-own-application-roles.html). Direct user assignments are possible for approved exceptions, but must be recorded and reviewed separately.

## 3. Share the workbook and dependencies

As the content owner, choose the approved team folder under **Catalog → Shared Folders**. Grant the chosen audience only the access it needs:

| Object | Where to check | Consumer access |
| --- | --- | --- |
| Team folder | Actions → Inspect → Access | Read-Only |
| Workbook | Inspect → Access; Share tab where available | Read-Only and View |
| Every dataset used by the workbook | Data → Datasets → Actions → Inspect → Access | Read-Only |
| Each connection referenced by those datasets | Data → Connections → Actions → Inspect → Access | Read-Only |

Use the actual dependency list, including datasets that combine connections. Check **Inspect → General** for object location, connection references and Object ID; do not assume sharing the workbook also shares everything it uses. Review **Shared Related Artifacts** when offered. Shared Folders is not anonymous/public access. See [catalog permissions](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/assign-shared-catalog-folder-workbook-permissions.html) and [dataset permissions](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/add-or-update-datasets-permissions.html).

For the standard shared connection, **Authentication → Always use these credentials** uses `OAC_FOCUS_READER` without giving its password to viewers. That account has [schema-wide read access](../../design/00-schema-bootstrap.md#created-objects-and-access), including internal tables; choose its audience accordingly. Workbook filters are not a security boundary. **Require users to enter their own credentials** is a different design requiring separately provisioned database identities and testing.

If the connection remains in **My Folders**:

1. Record its **Object ID** and authentication mode. In Catalog, select the original connection → **Move to → Shared Folders → approved team folder**.
2. Review the destination folder's access before confirming; moving from My Folders applies the destination permissions.
3. Verify the original Object ID and authentication mode are retained, the final **Access** list is correct and datasets still reference that connection.

Do not recreate the connection, distribute credentials or give viewers edit/full-control rights as a sharing workaround. See Oracle's [connection settings](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acsds/manage-connections-data-sources.html) and [catalog moves](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/move-catalog-folders-contents.html).

## Verify access

Have the viewer establish a fresh session with their own account:

- Open the shared workbook and test every deployed canvas and its datasets.
- Confirm expected data and a known valid period/currency filter work.
- Confirm no separate connection or database password is requested for the saved-credential design.
- Confirm the viewer can consume reports without unintended edit or administration rights.

Keep the user/group, effective roles, object locations, connection authentication mode and test result in private administration records. An administrator seeing data is not a substitute for this test.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Cannot sign in | Correct OAC URL, client routing/DNS, associated domain, account and federation. |
| Workbook not visible | Effective BI Consumer/audience roles, folder/workbook access and Share View. An empty direct-role list can still have inherited roles. |
| HTTP 403 or dataset metadata error | The named dataset and its original connection, their locations and access lists; a shared dataset may still use a private connection. |
| Only one canvas fails | That canvas's datasets/connections and source availability. |
| Unexpected database password prompt | Connection authentication mode; do not distribute the saved password. |
| Database authorization error after metadata access works | The [reader account and grants](oac-workbook-import.md#check-the-database-reader-if-connection-access-fails). |
| Empty or stale results | Filters, populated source/MV, refresh status and dataset Live/cache mode. Permissions do not load data. |

Inspect the failing layer rather than rebuilding database objects or broadening roles. If indirect-role lookup fails, inspect group memberships and the role hierarchy, then retest with a fresh session.

## Change or remove access

For role changes or departures, update group membership and review direct role/object grants that could preserve access. Follow the organization's session-revocation process. Do not delete a shared connection to remove one viewer.
