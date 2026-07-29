# Existing Landing Zone Journey

1. Inventory the current Terraform owner and address for every compartment,
   endpoint, database, NSG, and Vault secret.
2. Reference resources owned by another Landing Zone state through stable
   dependency-map outputs. Do not import them into this add-on.
3. For DBM/OPSI resources that this add-on will own, use declarative import or
   reviewed state moves into exactly one Resource Manager wave stack. Never leave one OCI
   resource at two Terraform addresses.
4. Render the complete current CDB/PDB family in one wave and require a
   refreshed plan with no unintended enable, replacement, or delete.
5. Apply only the saved plan after approval, verify live product data, then add
   later targets through new bounded waves.

Use the same manifest shape as the
[new-LZ example](../examples/new-landing-zone.manifest.json). Existing
composition outputs populate dependency maps. Add a stable producing output
before onboarding resources that are not yet exposed by the composition.
