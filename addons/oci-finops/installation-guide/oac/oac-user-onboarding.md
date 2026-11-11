# Onboard users to the FOCUSPLATFORM OAC workbook

This runbook explains how to give a colleague access to an existing FinOps workbook in Oracle Analytics Cloud (OAC). It covers the identity, application roles, catalog permissions, dataset dependencies, and saved database connection. Use it after the [workbook import](oac-workbook-import.md) and [database reader setup](../../design/00-schema-bootstrap.md#created-objects-and-access).

The procedure is for an authenticated **consumer** who views and filters shared reports. Creating datasets, editing workbooks, administering OAC, and public access are separate permissions. Use the target service's OAC catalog and role-management screens; labels can vary by service update.

## Contents

- [1. Understand the four access layers](#1-understand-the-four-access-layers)
- [2. Choose the user's access before assigning it](#2-choose-the-users-access-before-assigning-it)
- [3. Create or verify the identity and its group](#3-create-or-verify-the-identity-and-its-group)
- [4. Assign the OAC consumer role to the group](#4-assign-the-oac-consumer-role-to-the-group)
- [5. Check a person's direct and inherited OAC roles](#5-check-a-persons-direct-and-inherited-oac-roles)
- [6. Prepare the shared folder and workbook](#6-prepare-the-shared-folder-and-workbook)
- [7. Verify every dataset used by the workbook](#7-verify-every-dataset-used-by-the-workbook)
- [8. Share the existing database connection](#8-share-the-existing-database-connection)
- [9. Keep database provisioning separate from human onboarding](#9-keep-database-provisioning-separate-from-human-onboarding)
- [10. Accept the onboarding from the viewer's own session](#10-accept-the-onboarding-from-the-viewers-own-session)
- [11. Troubleshoot access at the failing layer](#11-troubleshoot-access-at-the-failing-layer)
- [12. Review access when a person leaves or changes role](#12-review-access-when-a-person-leaves-or-changes-role)
- [Administrator handover checklist](#administrator-handover-checklist)

## 1. Understand the four access layers

```text
Person's identity in the OAC-associated identity domain
  -> identity-domain group mapped to OAC application roles
  -> access to the shared folder, workbook, datasets and connection
  -> OAC uses the connection's database account to read FOCUSPLATFORM
```

| Layer | Where to manage or inspect it | What it controls |
| --- | --- | --- |
| Identity and group membership | OCI Console -> Identity & Security -> Domains -> the domain associated with this OAC instance -> Users / Groups | Who can authenticate and which identity groups contain the person. A federated identity can be managed by an external identity provider. |
| OAC application roles | OAC -> Navigator -> Console -> Roles and Permissions | Whether the person can consume, author, model, or administer Analytics content. Roles can be direct or inherited. |
| Catalog and object permissions | OAC -> Catalog or Data -> the object's Actions -> Inspect -> Access; workbook Share tab where available | Which specific folders, workbooks, datasets, and connections the person can use. |
| Database authorization | ADB, through the database administrator and the configured OAC connection | Which database objects the connection account can query. This is not an OAC application role. |

OCI IAM policies governing administration of an Analytics instance do not replace OAC workbook permissions. Likewise, the ADB resource principal, dynamic group, and policies used by ingestion do not onboard a human dashboard consumer. Account existence in the tenancy alone is insufficient: verify the identity domain actually associated with the OAC instance. [Oracle identity setup](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/use-identity-domains-users-groups.html).

## 2. Choose the user's access before assigning it

Record the target OAC instance, identity domain, exact user sign-in name, consumer group, intended reporting audience, shared folder, workbook, datasets, and connection. Keep actual user lists and credentials in the deployment's private administration records, not in this public repository.

| Intended activity | OAC application role | Content permissions |
| --- | --- | --- |
| Open and run the shared workbook, use its available filters | **BI Consumer** | Folder Read-Only, workbook Access Read-Only and Share View, dataset Read-Only, and access to the existing connection. |
| Explore visualizations beyond ordinary workbook consumption | **DV Consumer**, which participates in the predefined role hierarchy | Consumer access to the intended content; this does not authorize editing shared source datasets. |
| Create datasets or edit visualization workbooks | **DV Content Author** | Appropriate edit permissions on the specific authoring content and connection. This is an author onboarding, not the default consumer procedure. |
| Manage OAC security and service configuration | **BI Service Administrator** or an authorized delegated administrator | Administrative scope; do not give this role just to resolve a viewer's access error. |

The supported identity-domain application roles for the Analytics application are **ServiceViewer**, **ServiceUser**, and **ServiceAdministrator**. They map to OAC's predefined role hierarchy; they are not OCI tenancy policies or database roles. Prefer the consumer mapping for viewers rather than an author or administrator mapping. Verify the resulting effective OAC roles instead of relying on a similarly named IAM group. [Oracle predefined application roles and mappings](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/predefined-application-roles.html).

Choose one object-sharing audience:

- **All OAC BI consumers:** assign `BIConsumer` Read-Only to the shared reporting objects. Every effective member of that application role is in the audience, not just the colleague being onboarded.
- **Only a FinOps audience:** map an approved identity group to a dedicated OAC application role such as `FinOps Workbook Viewer`, and use that role in the catalog access lists. Give the group the required consumer application capability as well. Do not leave a broad `BIConsumer` grant on the same objects if access is intended to be restricted to the FinOps audience.

Shared Folders is an authenticated catalog area, not a public internet link and not automatic access for every OCI tenancy user. The relevant OAC identity and effective application-role memberships still apply.

## 3. Create or verify the identity and its group

**Who:** identity-domain administrator, or the administrator of the federated identity provider.

1. In OCI Console, identify the identity domain associated with the target OAC instance. Check the domain explicitly when the tenancy has several domains.
2. Open **Identity & Security -> Domains -> <domain> -> Users**. Search for the person's exact sign-in identifier; do not assume a display name uniquely identifies an account.
3. If the account does not exist, provision it through the organization's normal identity process. For a federated account, use the source identity provider and its approved synchronization process rather than creating a duplicate local identity.
4. Open **Groups**, find the approved Analytics consumer group, and add the intended account if it is not already a member. Alternatively, inspect the user's group memberships from its user details.
5. Confirm the account is active and can sign in to the correct OAC URL using its own identity.

No OCI tenancy Administrator membership, new ingestion policy, or human database login is required merely to consume this workbook. Network or sign-in restrictions can still apply to the deployment.

## 4. Assign the OAC consumer role to the group

**Who:** OAC service administrator or an administrator delegated to manage application roles.

1. Sign in to the target OAC as the administrator.
2. Open **Navigator -> Console -> Roles and Permissions -> Application Roles**.
3. Select **BI Consumer**. Under **Members**, choose **Groups**.
4. Inspect existing group memberships first. If the approved identity group is absent, use **Add Groups**, search for the exact group, select it, and choose **Add Selected**.
5. If using a dedicated FinOps application role for object access, create or select that role and add the same approved group to its membership. For a new audience role, use **Create Application Role**, enter its name/display name/description, select **None** for initial application permissions, and choose **Create**; then use **Members -> Groups -> Add Groups**. The BI Consumer group assignment from steps 3-4 supplies consumer capability, while the new role identifies the audience in object access lists. [Oracle custom application-role procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/add-your-own-application-roles.html).
6. Confirm the group membership is visible. Avoid adding a second direct user assignment when the group already provides the required effective role.

Direct assignment is possible for an approved exception: select the application role, choose **Members -> Users -> Add Users**, and add the exact account. Record the exception so removal is possible later. Group-based onboarding is preferable for repeatable administration. [Oracle group-role assignment procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/assign-application-roles-groups.html).

## 5. Check a person's direct and inherited OAC roles

1. Open **Console -> Roles and Permissions -> Users**.
2. Search for the exact username, for example `viewer@example.com`, and submit the search if the list has not filtered.
3. Select the returned account. **Groups** shows its direct identity-group memberships.
4. Select the user's **Application Roles** detail tab. Initially this lists direct assignments.
5. Choose **Show Indirect Assignments** and accept the read-only query prompt. This asks OAC to include memberships inherited through groups or other roles; wait for the result.
6. Confirm the required consumer role and the role used in the reporting objects' access lists. **Export**, where available, provides membership evidence for the private onboarding record.

An empty direct list does **not** establish that the user has no effective roles. If the inherited query fails, returns an unusable result, or remains incomplete, inspect the relevant group's application-role membership and the application's role hierarchy. Do not grant administrator access as a diagnostic shortcut. Refresh the administrative view and ask the user to establish a new session after an approved membership change. [Oracle direct and indirect membership procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acabi/view-export-detailed-membership-data.html).

## 6. Prepare the shared folder and workbook

**Who:** content owner or authorized catalog administrator. Preparing content is normally a one-time deployment task, not a task repeated for every new viewer.

Choose the approved team folder under **Shared Folders** and the imported workbook. Reuse these locations consistently for its dependencies.

1. Open **Navigator -> Catalog -> Shared Folders**. Locate the intended team folder or create an approved subfolder.
2. Use the folder's **Actions -> Inspect -> Access**. Grant the chosen consumer application role **Read-Only**. Keep editing access with the approved content administrators/authors.
3. Locate the workbook and inspect **Access**. Verify the same audience has **Read-Only**.
4. Inspect the workbook's **Share** tab, where exposed, and use **View** for consumers. A View share does not turn a consumer into an author.
5. Save intended changes. If OAC offers **Shared Related Artifacts**, review the listed dependencies rather than assuming the workbook is the only object involved.

Folder access, workbook access, and workbook View/Edit sharing are distinct settings. Sharing a workbook does not prove that every dependency is accessible. [Oracle catalog and workbook permissions](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/assign-shared-catalog-folder-workbook-permissions.html).

## 7. Verify every dataset used by the workbook

Use the imported workbook's actual dependency list. The [import guide](oac-workbook-import.md) identifies the packaged workbook and source requirements. Check every dataset and connection used by the deployed canvases.

For **each** actual dependency:

1. Open **Navigator -> Data -> Datasets** and locate it.
2. Use **Actions -> Inspect -> General** to record its **Location**, **Connection**, and **Object ID**. A shared workbook can still depend on an object in someone's My Folders.
3. Inspect **Access** and confirm the intended application role has **Read-Only**. Consumer use does not require Read-Write or Full Control.
4. Check every connection named by that dataset, including additional connections if it combines sources.
5. Save only approved changes. If relocating a dataset, use the Catalog move action and recheck its location, permissions, and workbook references afterwards.

Dataset permissions are administered separately from a person's application role. [Oracle dataset permission procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/add-or-update-datasets-permissions.html).

## 8. Share the existing database connection

**The viewer does not need to create a personal duplicate connection.** Identify the connection referenced by the imported datasets and its reporting account. Check access to that connection together with access to each dataset.

### Inspect authentication and database scope

In **Data -> Connections -> <connection> -> Actions -> Inspect -> General**, check:

- **Location:** for team use, the connection belongs in the approved Shared Folders area, not the owner's My Folders.
- **Authentication:** **Always use these credentials** means OAC uses the configured database account; viewers do not receive or enter that password. **Require users to enter their own credentials** is a different design that requires each person's authorized database credentials.
- **Object ID:** record it before a move so the original connection can be identified afterwards. Do not delete and recreate the connection as a sharing fix.

Granting use of a saved-credential connection extends access to the objects allowed to its database account. This repository's [OAC reader setup](../../design/00-schema-bootstrap.md#created-objects-and-access) deliberately grants `OAC_FOCUS_READER` schema-wide read access to current and future `FOCUSPLATFORM` tables, MVs, and views, including internal tables. Review that scope when choosing the connection's audience. Workbook filters are not a database authorization boundary. A design that needs narrower or per-person data access requires a separately reviewed database/semantic security model.

### Move a private connection without creating another one

1. In **Catalog -> My Folders**, select only the database connection referenced by the workbook datasets.
2. Choose **Move 1 item**, or right-click and choose **Move to...**.
3. In the move dialog, open **Shared Folders**, then the approved team folder.
4. Before confirming, inspect the destination folder's audience. Moving from My Folders to Shared Folders applies the destination folder's access settings to the item.
5. Confirm the move. Do not export a wallet, copy a password, create another connection, or change connection credentials for this operation.
6. Open the destination folder and verify the connection is present. Inspect **General**: Location must be the approved shared team folder, the original Object ID must be retained, and the intended authentication mode must be unchanged.
7. Inspect **Access**, which is available for the shared connection. Verify the consumer role has **Read-Only**, and administrators retain their intended management access. Do not give consumers Read-Write or Full Control merely to resolve an access error.
8. Recheck the datasets' connection references. If a deployment reports a stale reference, inspect the reference before rebinding; do not create a replacement just because an error remains in an old browser session.

Review the effective permissions after the move, including any inherited grants. A move between shared folders can have different inheritance behavior from a move out of My Folders; inspect the final access list in either case.

See Oracle's [connection location and authentication options](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acsds/manage-connections-data-sources.html), [Catalog move procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/move-catalog-folders-contents.html), and [access inheritance rules](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acubi/catalog-access-inheritance-rules.html).

## 9. Keep database provisioning separate from human onboarding

The OAC connection must already have network access to ADB and an authenticated reporting account. Module 00 creates and authorizes the [database reader](../../design/00-schema-bootstrap.md#created-objects-and-access); no additional reader setup is needed for each viewer. Adding a viewer normally changes identity/group or OAC permissions, not database grants.

Verify the connection points to the intended deployment and reads the published reporting interfaces used by the workbook, particularly `FOCUSPLATFORM.OAC_OCI_FOCUS_COST_DETAIL`. New viewers do not require `ADMIN`, `FOCUSPLATFORM`, installer privileges, pipeline credentials, or permission to build/refresh MVs. A healthy database connection alone does not establish that another OAC identity can access its catalog metadata.

For this shared-credential design, a colleague does not need their own database user, wallet, or independently configured OAC connection. Per-user authentication must instead be provisioned and tested explicitly if that mode is selected.

## 10. Accept the onboarding from the viewer's own session

The administrator seeing data is not the acceptance test. Ask the new user to:

1. Sign out and establish a fresh OAC session with their **own** account after access changes. Do not share the owner's login or impersonate the colleague by copying a session.
2. Open the shared workbook from Catalog or its approved link.
3. Confirm the intended canvases open, the cost charts return expected rows, and a known valid month/currency filter changes the results.
4. Exercise datasets used on other canvases, including commitments and Advisor if those are part of the deployed workbook. One working chart does not prove every dependency is shared.
5. Confirm the workflow does not require another connection or database password when **Always use these credentials** is selected.
6. Confirm consumer restrictions are appropriate: the user can view the shared content without acquiring edit, credential-management, or service-administration rights.

Record privately: user/group, effective application roles and assignment source, shared folder, workbook and dependency names, connection location/authentication mode, granted access levels, test time, and the viewer's result. A missing optional module or a genuinely empty period should be distinguished from authorization failure.

## 11. Troubleshoot access at the failing layer

| Symptom | What to inspect first | Next action |
| --- | --- | --- |
| Cannot sign in or is absent from the expected user search | OAC URL, associated identity domain, account status, federation and group provisioning | Correct the identity path; do not add database privileges. |
| Can sign in but cannot find the workbook | Folder/workbook Access, Share View, and effective OAC consumer role | Verify direct and inherited access and start a fresh user session. |
| Workbook opens but reports HTTP 403, `User is forbidden`, or `Failed to download metadata for dataset` | The exact dataset/connection name and Object ID in the error, then their locations and access lists | Check for a shared workbook/dataset depending on a private connection. Share or move the original dependency for the approved audience. |
| Empty direct application-role list | Groups and Show Indirect Assignments | Confirm inherited roles; an empty direct list is not proof of no effective access. |
| Only one canvas fails | Its own dataset and connection dependencies | Inspect that canvas's sources rather than broadening every permission. |
| Database password prompt | Connection Authentication | Determine whether per-user credentials were intentionally required; do not distribute the saved reporting password. |
| Oracle database authorization error, such as `ORA-01031`, after metadata access succeeds | Connection account and database reporting grants | Use the [database-reader check](oac-workbook-import.md#check-the-database-reader-if-connection-access-fails); distinguish this from OAC catalog HTTP 403. |
| Queries succeed but no rows or stale rows are shown | Filters, source/MV population and refresh status, dataset Live/cache mode | Investigate data readiness separately; permissions do not populate a MV. |

An HTTP 403 in this path indicates an authorization rejection at the reported metadata request. It does not by itself prove a broken database MV, identify every missing permission, or justify rebuilding a source object. Preserve the error text and test the specific dependency chain.

## 12. Review access when a person leaves or changes role

Remove the person's membership from the approved consumer group, then review any direct OAC role or object grants that would preserve access. For a business audience change, review the relevant catalog access lists and the connection's database scope. Do not remove a shared connection merely to offboard one person: it is a dependency of other users' datasets and workbooks. Verify access removal under the organization's session and identity lifecycle process.

## Administrator handover checklist

- [ ] Correct OAC instance, identity domain, and exact user identified.
- [ ] Approved group membership and effective OAC consumer roles verified.
- [ ] Intended audience selected: all BI consumers or a restricted FinOps role.
- [ ] Folder and workbook Read-Only / View access checked.
- [ ] Every actual dataset and every referenced connection checked.
- [ ] Shared connection location, saved-credential scope, and final access list reviewed.
- [ ] Original connection identity and dataset references verified after any move.
- [ ] Viewer completed the acceptance checks in their own session.
- [ ] Access evidence and ownership recorded privately; no credentials committed.

The SQL installers do not perform these OAC identity or catalog actions. Reuse this runbook for each onboarding; repeat the shared-content preparation only when the workbook dependencies, audience, or connection configuration change.
