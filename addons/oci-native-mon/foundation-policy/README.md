# Resource-scoped Vault Policy

This optional foundation root replaces tenancy-specific policy strings and
avoids compartment-wide Vault/Key grants. Use it when the Landing Zone does not
already own equivalent resource-scoped policies.

```text
cp terraform.tfvars.json.template terraform.tfvars.json
chmod 600 terraform.tfvars.json

../scripts/run-fleet.sh plan . reviewed.tfplan
../scripts/run-fleet.sh package . ../../foundation-policy-resource-manager.zip
```

Use a dedicated Resource Manager stack/state. Existing customers should keep
policy ownership in their current identity composition and must not deploy a
duplicate.

The included `schema.yaml` exposes the exact policy scope in the OCI Resource
Manager stack workflow and keeps state viewing disabled.
