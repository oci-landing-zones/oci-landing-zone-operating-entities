# Multi-OE Generic Multi-Stack Runtime

The multi-stack runtime publishes state-boundary projections for distributed operations.

## Sequence

For each stack folder, choose exactly one hub network file family and one CIS level. For example, a Hub A / CIS Level 2 deployment uses `multioe_network_hub_a_pre.json`, `multioe_security_cis2_pre.json`, and `multioe_observability_cis2_pre.json` in the pre phase, then replaces those with the matching final files.

1. Apply OP01 shared-services pre files.
2. Apply each OP02 OE pre file set.
3. Apply each OP03 project file set.
4. Reapply OP01 with final files.
5. Reapply each OP02 OE with final files.

Dependency outputs from earlier operations must be provided to later OCI Resource Manager stacks or Terraform runs. This follows the One-OE deployment approach: pre files create resources that can be deployed without late-bound IDs, and final files complete routing, security-zone targets, and flow logs after dependencies exist.

OP03 project onboarding adds project compartments, project IAM, and project NSGs for Project Type A. Projects share the environment project subnets and are isolated with project NSGs.

Prefer Terraform CLI locally or from customer-controlled CI/CD. If OCI Resource Manager is used, stage these files in a customer-controlled private Object Storage bucket or approved private GitHub source.

## Operations

- [OP01 Manage Shared Services](./op01_manage_shared_services/readme.md)
- [OP02 Manage OE Alpha](./op02_manage_oes/oe-alpha/readme.md)
- [OP03 OE Alpha Preprod Project 1](./op03_manage_projects/oe-alpha/preprod/proj1/readme.md)
- [OP03 OE Alpha Prod Project 1](./op03_manage_projects/oe-alpha/prod/proj1/readme.md)
