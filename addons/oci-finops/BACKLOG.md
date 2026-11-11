# Maintenance backlog

Pending code cleanup for the FinOps add-on. Installation procedures are defined in [the installation guide](installation-guide/README.md).

## Contents

- [Confirm ADB Identity API permissions](#confirm-adb-identity-api-permissions)
- [Validate the parent deployment and remove the demo exception](#validate-the-parent-deployment-and-remove-the-demo-exception)

## Confirm ADB Identity API permissions

**Status:** pending verification of effective permissions.

The account-context preflight and collector require `TENANCY_INSPECT` for `GetTenancy`/`ListRegionSubscriptions` and `COMPARTMENT_INSPECT` for `ListCompartments`. These grants are not explicit in the FinOps JSON; confirm whether the deployed Landing Zone supplies them to the ADB Resource Principal. See the [IAM policy reference](installation-guide/infrastructure/iam-policies.md#additional-access-to-verify).

- [ ] Identify the effective policies authorizing both permissions for the ADB principal.
- [ ] Run the account-context read-only preflight in the parent tenancy and retain the results.
- [ ] If access is missing, prepare the required change in the owning IAM configuration and keep its documentation aligned. Changes outside the add-on require prior approval.
- [ ] Verify the effective ADB permissions separately from those of the identity running Python.

## Validate the parent deployment and remove the demo exception

**Status:** pending validation in a parent tenancy.

### Context

The solution targets a **parent tenancy**. Current demo testing is limited to a child tenancy because a parent environment is not available for those tests. Full parent-tenancy installation and commercial API validation remain pending.

The [Python installer](deployment/python/finops_addon.py) still contains `--child-demo-skip-commercial` and `apply_child_demo_exception`. This explicit demo-only path can omit the account/contracts module only when preflight positively identifies a CHILD commercial limitation. It does not validate commercial API access or represent a complete installation of the solution.

This exception is recorded here for maintenance; it is not part of the installation guides.

### Work remaining

- [ ] Validate the complete deployment in a parent tenancy: IaC infrastructure, ADMIN password change and Secrets, all mandatory database modules, account/contracts commercial APIs, and OAC connectivity/workbook.
- [ ] Once parent validation is complete, remove `--child-demo-skip-commercial`, its helper, conditional module-skipping path, and exception-specific messages/audit handling.
- [ ] Preserve the normal prerequisite checks: required commercial/API failures must block the complete installation.
- [ ] Verify that the standard installation succeeds in the parent tenancy and that CLI help no longer exposes the demo exception.
