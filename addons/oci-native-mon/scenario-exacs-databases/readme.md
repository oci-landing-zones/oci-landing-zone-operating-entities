# Base Database and Exadata Database Service

This scenario supplies Landing Zone foundation JSON for IAM, network, NSGs,
compartments, and Vault integration. Target onboarding is automated by the
[fleet workflow](../fleet-onboarding/) instead of console steps.

| Product | Base Database | Exadata Database Service |
| --- | --- | --- |
| Database Management | Supported | Supported |
| Operations Insights | `VIRTUAL_MACHINE` or `BARE_METAL` | `EXACS` |
| Log Analytics | Supported | Supported |

Choose shared private endpoints in a hub monitoring subnet for multi-entity
fleets, or local endpoints for smaller isolated environments. Confirm routing,
DNS, and NSG reachability from each endpoint to the database listener before
apply.

Apply the scenario JSON through the normal Landing Zone composition. Use the
[Base Database Terraform root](../scenario-base-databases/terraform/) or
[EXACS Terraform root](./terraform/) for a direct target deployment, or map
the same stable output keys into the fleet manifest and promote bounded canary
waves.
The legacy `Implementation_addon_steps.md` is retained for historical context
only and is not the supported execution workflow.
