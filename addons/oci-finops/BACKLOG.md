# Maintenance backlog

Pending code cleanup for the FinOps add-on. Installation procedures are defined in [SETUP](installation-guide/README.md).

## Contents

- [Remove the child-tenancy demo exception](#remove-the-child-tenancy-demo-exception)

## Remove the child-tenancy demo exception

**Status:** pending validation in a parent tenancy.

### Context

The solution targets a **parent tenancy**. Current demo testing is limited to a child tenancy because a parent environment is not available for those tests. Full parent-tenancy installation and commercial API validation remain pending.

The [Python installer](deployment/python/finops_addon.py) still contains `--child-demo-skip-commercial` and `apply_child_demo_exception`. This explicit demo-only path can omit the account/contracts module only when preflight positively identifies a CHILD commercial limitation. It does not validate commercial API access or represent a complete installation of the solution.

This exception is recorded here for maintenance; it is not part of the installation guides.

### Work remaining

- [ ] Validate the complete installation in a parent tenancy, including account/contracts and the required commercial APIs.
- [ ] Once parent validation is complete, remove `--child-demo-skip-commercial`, its helper, conditional module-skipping path, and exception-specific messages/audit handling.
- [ ] Preserve the normal prerequisite checks: required commercial/API failures must block the complete installation.
- [ ] Verify that the standard installation succeeds in the parent tenancy and that CLI help no longer exposes the demo exception.
