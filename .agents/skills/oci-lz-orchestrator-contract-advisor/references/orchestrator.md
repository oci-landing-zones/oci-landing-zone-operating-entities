# Orchestrator Contract Reference

## Source Order

Use the active deployment ref as the contract source. If the user is troubleshooting local files, use the local checkout. If the deployment is pinned to a release or commit, inspect that ref instead of the remote default branch.

Read these files first when present:

- `README.md`
- `SPEC.md`
- `variables.tf`
- `outputs.tf`
- `rms-facade/variables.tf`
- `rms-facade/get_dependencies.tf`
- `rms-facade/outputs.tf`

## Checks

- Root configuration families must be present in `variables.tf`.
- Dependency inputs must be present in the active root module and, for ORM, loaded by `rms-facade/get_dependencies.tf`.
- Output file names should come from `outputs.tf` or `rms-facade/outputs.tf`, not README tables alone.
- Backing module behavior belongs to the module repository; root Orchestrator variables only prove what the root accepts.

## Common Traps

- Not every output file has a matching dependency input.
- README output tables can drift from Terraform code.
- Resource Manager schema wording comes from `rms-facade/schema.yml`.
- A generated output can be useful context without being accepted as a downstream dependency input.
