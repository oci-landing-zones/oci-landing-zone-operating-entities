# New Landing Zone Journey

1. Apply the scenario IAM/network/security JSON through the same One-OE
   composition that owns those resources.
2. If that composition does not already own resource-scoped Vault/Key access,
   deploy the [`foundation-policy`](../foundation-policy/) root with the
   reviewed Vault and key OCIDs. Never add compartment-wide grants.
3. Read the resulting compartment, database, private-endpoint, and Vault-secret
   IDs from that composition's outputs. Do not copy values from Terraform state
   by hand.
4. Copy [`new-landing-zone.manifest.json`](../examples/new-landing-zone.manifest.json)
   to an ignored `0600` file and replace placeholders. Stable keys on the left
   remain unchanged; only dependency-map `id` values contain OCIDs.
5. Run the root README's `render`, `plan`, and explicit `apply` commands with a
   different OCI Resource Manager stack/state for every wave.
6. Run Log Analytics validate, explicit apply, and verify for each emitted
   collection file.

The example assumes the foundation already creates or exposes private
endpoints. If the target design creates endpoints through this adapter, add the
corresponding VCN/subnet/NSG dependency keys from the LZ composition.

The shipped scenario JSON deliberately omits compartment-wide `use vaults` and
`use keys`; the foundation-policy root supplies the OOTB least-privilege path.
