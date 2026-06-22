# OP01 Manage Shared Services

This state owns shared landing-zone services: governance, shared IAM, `COMMON-DOMAIN`, shared hub networking, shared security baseline resources, and shared observability topics/event rules/logging.

It must not own OE compartments, project compartments, project groups, project policies, OE VCNs, OE security-zone targets, project NSGs, or OE flow logs.

## Dependencies

OP01 is the first operation. OP02 IAM depends on the OP01 landing-zone parent compartment output. OP02 network depends on OP01 hub/network outputs. OP02 observability depends on OP01 notification topic outputs and does not recreate OP01 topics.

Choose exactly one hub family and one CIS level. Apply pre files first for staged hub/security/observability setup. Reapply this state with final files after OP02 and OP03 operations provide dependency outputs for final shared routing, shared security-zone targets, and shared flow logs.

Use Terraform CLI or customer-controlled CI/CD by default. ORM users should stage these files in a private Object Storage bucket or approved private GitHub source.

## Files

- `multioe_governance.json`
- `multioe_iam.json`
- `multioe_network_hub_a_pre.json`
- `multioe_network_hub_a.json`
- `multioe_network_hub_b_pre.json`
- `multioe_network_hub_b.json`
- `multioe_network_hub_c_pre.json`
- `multioe_network_hub_c.json`
- `multioe_network_hub_c_backends.json`
- `multioe_network_hub_e.json`
- `multioe_security_cis1_pre.json`
- `multioe_security_cis1.json`
- `multioe_security_cis2_pre.json`
- `multioe_security_cis2.json`
- `multioe_observability_cis1_pre.json`
- `multioe_observability_cis1.json`
- `multioe_observability_cis2_pre.json`
- `multioe_observability_cis2.json`
