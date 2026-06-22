# OP02 Manage OE Alpha

This state owns the OE Alpha compartment tree down to environment container compartments, OE environment shared-project VCNs/subnets/routing, OE environment security-zone targets, and OE-level observability.

It must not own project child compartments, project groups, project policies, or project-owned NSGs.

## Dependencies

OP02 IAM depends on the OP01 landing-zone parent compartment output. OP02 network depends on OP01 hub/network outputs. OP02 security depends on OP01 shared security compartment outputs. OP02 observability depends on OP01 notification topic outputs and does not recreate OP01 topics or home-region rules.

Choose the same hub family and CIS level used by OP01. Apply pre files first. Reapply this state with final files after OP03 project operations provide dependency outputs for final OE routing, OE security-zone targets, and OE flow logs.

Use Terraform CLI or customer-controlled CI/CD by default. ORM users should stage these files in a private Object Storage bucket or approved private GitHub source.

## Files

- `multioe_iam.json`
- `multioe_network_hub_a_pre.json`
- `multioe_network_hub_a.json`
- `multioe_network_hub_b_pre.json`
- `multioe_network_hub_b.json`
- `multioe_network_hub_c_pre.json`
- `multioe_network_hub_c.json`
- `multioe_network_hub_e.json`
- `multioe_security_cis1_pre.json`
- `multioe_security_cis1.json`
- `multioe_security_cis2_pre.json`
- `multioe_security_cis2.json`
- `multioe_observability_cis1_pre.json`
- `multioe_observability_cis1.json`
- `multioe_observability_cis2_pre.json`
- `multioe_observability_cis2.json`
