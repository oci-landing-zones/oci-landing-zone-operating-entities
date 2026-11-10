# Cost governance

## 1. Cost governance tags

The One-OE blueprint includes a default cost-governance configuration in
`oneoe_governance.json`. It defines the `tagns-lz-cost-governance` namespace and
six tags: cost center, business unit, owner, platform, environment, and project.

Together, these tags establish a consistent classification model for resources
across the landing zone. They help teams identify ownership, allocate costs,
analyze spending by business and technical scope, and monitor budgets using
shared reporting criteria.

The blueprint assigns these tags to supported resources and automatically applies
default values to new taggable resources within the landing-zone hierarchy.
Customers can require users to supply tag values during resource creation by
enabling required tagging at deployment time.

![One-OE FinOps tags](../../design/images/FinOps_tags.png)

<a id="tag-values"></a>

### 1.1. Tag values

The table lists the default tag values used in the One-OE blueprint and the
example allowed values defined in `oneoe_governance.json`. The configured lists
standardize tagging: users must select a value from the list defined for each
tag rather than enter arbitrary values. Your cost-management team should define
and maintain these lists so that resource tags follow the organization's cost
allocation and reporting conventions. Update the tag validators and resource
assignments together to use those approved values.

`tobedefined` is an accepted placeholder. Replace it with an approved value before
relying on cost-allocation reports.

The supplied configurations assign tag values explicitly. By default, Tag Defaults
automatically fill missing tags. When required tagging is enabled, users must
supply the values instead.

| Tag | Default value in One-OE | Examples of allowed values |
|---|---|---|
| `tag-lz-cost-center` | `tobedefined` | `CC12345` |
| `tag-lz-business-unit` | `tobedefined` | `IT`, `Finance`, `Retail` |
| `tag-lz-owner` | `tobedefined` | `email.address@example.com` |
| `tag-lz-platform` | `network`, `security`, `observability`, or `tobedefined`, according to resource purpose | `network`, `security`, `observability`, `oke`, `ocvs`, `exacs`, `exacc`, `ebs`, `hpc`, `finops`, `ai-services`, `apps` |
| `tag-lz-environment` | `shared`, `prod`, or `preprod`, according to resource scope | `dev`, `preprod`, `prod`, `shared`, `staging`, `test` |
| `tag-lz-project` | `notapplicable` or `proj1`, according to resource scope | `notapplicable`, `proj1`, `proj2` |

### 1.2. Tag assignments in the One-OE blueprint

The One-OE blueprint assigns tags according to each resource's purpose and scope:

- **Platform:** `network`, `security`, or `observability` for the corresponding
  resources; `tobedefined` for other IAM resources.
- **Environment:** `shared`, `prod`, or `preprod`. The hub's public load balancer
  uses `prod` because it serves production.
- **Project:** `proj1` for project-specific resources and `notapplicable` for shared
  resources.

Existing access-control tags are preserved. Components that do not support
tagging, such as listeners, backends, and NSG rules, do not receive separate tags.

### 1.3. Tag Defaults and optional required tagging

In Studio, use **Observability and cost → FinOps/Governance tags → Require values for all six cost tags**. Blueprint Factory exposes the same setting as `cost_governance.require_tag_values`. The setting changes `is_user_required` for the six cost tags while preserving their default values and access-control tags. Explicit placeholder values still satisfy OCI's requirement to supply a value.

By default, all six Tag Defaults use `is_user_required: false` in
`oneoe_governance.json`. They automatically apply the configured default values
to new taggable resources in the landing-zone compartment and its child
compartments, including resources created by add-ons and workload extensions.
Existing resources are not tagged retroactively. Allowed-value validators
remain active.

If you want users to explicitly supply all six cost-governance tag values,
change `is_user_required` to `true` in each of the six `tag_defaults` entries in
your deployment copy of `oneoe_governance.json` before deploying the landing
zone. Use that reviewed configuration when creating or updating the deployment
stack. With `true`, missing tags are not filled automatically and resource
creation fails if required values are omitted. Values must match the configured
allowed lists.

Setting this flag to `true` makes tag values user-required; it is not necessary
just to use the tags. Review the default values with your cost-management team,
and review the [known issues](known_issues.md#required-tags-on-implicitly-created-resources)
before enabling required tagging for add-ons or workload extensions. Preserve
existing access-control tags. See [OCI Tag Defaults](https://docs.oracle.com/en-us/iaas/Content/Tagging/Tasks/managingtagdefaults.htm).

For deployment prerequisites and sequencing, follow the selected hub guide
linked from the [One-OE deployment overview](readme.md).

[Orchestrator v2.4.1](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/releases/tag/v2.4.1)
is the minimum version required to deploy this blueprint's Tag Default
configuration.

<a id="monthly-budgets"></a>

## 2. Budgets

Studio inherits these eight budgets in **Observability and cost**. You can edit each budget's name, monthly amount, alert percentage and recipients. **Use one email for all budget alerts** applies one address to all active rules; turn it off to configure recipients individually. Budget keys and compartment/tag targets remain stable when names change. Budgets start collapsed; use the trash icon to omit an inherited budget, and **Removed budgets** to restore it. Additional projects assigned to an environment get their own budget automatically. Use **Add tag-based budget** to add a monthly budget targeting a FinOps/Governance tag value.

In the tags table, **LOV (List of values)** is editable using comma-separated values; **Configuration** shows **All landing zone**. The generated LOV retains values already assigned by the landing zone, active budgets and Tag Defaults.

Blueprint Factory accepts the same overrides under `cost_governance.budgets`, plus `cost_governance.budget_recipients` for a shared recipient string. Providing `cost_governance` opts config-mode Home designs into these budgets and the six cost Tag Defaults. Omitting it preserves the existing factory behavior. See the [configuration reference](../../../../addons/oci-lz-blueprint-factory/blueprint-factory-configuration-reference.md#cost-tags-and-inherited-budgets).

The One-OE blueprint includes eight monthly budgets by default in
`oneoe_governance.json`. They track spending across the landing zone as a whole
and for selected cost centers, business units, environments, and projects.

These budgets help teams compare actual spending with planned amounts and
identify where costs need attention. Each budget includes an alert configured
at 80% of its monthly amount, helping the responsible teams review usage and
take action. Review the example amounts, targets, and notification recipients
to match your organization's cost-management needs.

| Target | Value | Monthly amount |
|---|---|---:|
| Compartment | `cmp-landingzone` and its children | 10000 |
| `tag-lz-cost-center` | `CC12345` | 5000 |
| `tag-lz-business-unit` | `IT` | 5000 |
| `tag-lz-business-unit` | `Finance` | 5000 |
| `tag-lz-business-unit` | `Retail` | 5000 |
| `tag-lz-environment` | `prod` | 3000 |
| `tag-lz-environment` | `preprod` | 2000 |
| `tag-lz-project` | `proj1` | 500 |

The overall budget covers `cmp-landingzone` and its child compartments.
Tag-based budgets track matching tag values across the tenancy, so resources
outside the landing zone can also contribute to those budgets. Update placeholder
values such as `tobedefined` so spending is attributed correctly.

Amounts use the tenancy's rate-card currency, and monthly periods start on day 1.
Replace `email.address@example.com` with your notification recipients.
Budget totals can overlap because the same resource may contribute to several
budgets; do not add them together.

Budgets provide spending alerts, not spending caps: they do not stop resources.
Budget alerts are evaluated periodically, not in real time.
See [OCI Budgets](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm).

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../../../LICENSE.txt) for more details.
