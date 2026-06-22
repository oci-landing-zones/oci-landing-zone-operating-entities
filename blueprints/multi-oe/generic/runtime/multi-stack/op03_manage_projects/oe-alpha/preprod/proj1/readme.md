# OP03 Manage OE Alpha Preprod Project 1

This state owns the OE Alpha preprod `proj1` project compartment, project IAM, and project-owned NSGs.

## Dependencies

OP03 IAM depends on the OP02 environment `projects` compartment output for its `default_parent_id` and on OP01 `COMMON-DOMAIN`. OP03 network depends on the OP02 OE environment VCN output and injects only project NSGs with `inject_into_existing_vcns`.

Use Terraform CLI or customer-controlled CI/CD by default. ORM users should stage these files in a private Object Storage bucket or approved private GitHub source.

## Files

- `multioe_iam.json`
- `multioe_network.json`
