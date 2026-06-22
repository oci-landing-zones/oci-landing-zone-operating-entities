# Multi-OE Generic Single-Stack Runtime

The single-stack runtime deploys the generated Multi-OE foundation in one Terraform state. It includes governance, IAM, hub networking, OE environment networks, project compartments, project NSGs, security, and observability.

Prefer Terraform CLI locally or from customer-controlled CI/CD. If OCI Resource Manager is used, stage these files in a customer-controlled private Object Storage bucket or approved private GitHub source.

This runtime publishes Project Type A only: projects share the environment project subnets and are isolated with project NSGs.

## Files

| Area | Files |
|---|---|
| Governance | `multioe_governance.json` |
| IAM | `multioe_iam.json` |
| Hub network | `multioe_network_hub_a_pre.json`, `multioe_network_hub_a.json`, `multioe_network_hub_b_pre.json`, `multioe_network_hub_b.json`, `multioe_network_hub_c_pre.json`, `multioe_network_hub_c.json`, `multioe_network_hub_c_backends.json`, `multioe_network_hub_e.json` |
| Security | `multioe_security_cis1_pre.json`, `multioe_security_cis1.json`, `multioe_security_cis2_pre.json`, `multioe_security_cis2.json` |
| Observability | `multioe_observability_cis1_pre.json`, `multioe_observability_cis1.json`, `multioe_observability_cis2_pre.json`, `multioe_observability_cis2.json` |
