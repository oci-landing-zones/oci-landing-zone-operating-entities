# Exadata Cloud@Customer

ExaCC requires customer-owned FastConnect or IPSec connectivity, routing, DNS,
and firewall reachability between the customer data center and OCI private
endpoints.

| Product | Contract |
| --- | --- |
| Database Management | Target-specific Terraform automation; require a live canary |
| Operations Insights | Not emitted by this module |
| Log Analytics | Guarded Management Agent collection supported |

Apply the scenario IAM/security JSON through the Landing Zone workflow, then
use the [ExaCC Terraform root](./terraform/) for Management Agent install keys,
external database registration, and DBM feature enablement. Use the
[fleet renderer](../fleet-onboarding/) for Log Analytics targets. Do not
promote beyond a canary until listener connectivity, agent/plugin readiness,
database privileges, current DBM metrics, and actual Log Analytics rows are
proven.

The legacy `Implementation_addon_steps.md` is retained for historical context
only and is not the supported execution workflow.
