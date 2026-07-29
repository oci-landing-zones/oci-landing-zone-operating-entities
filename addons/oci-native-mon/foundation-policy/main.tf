provider "oci" {
  region = var.region
}

resource "oci_identity_policy" "monitoring_secret_access" {
  compartment_id = var.policy_compartment_id
  name           = var.policy_name
  description    = "Resource-scoped Vault and key access for database observability."

  statements = [
    "Allow group ${var.group_name} to use vaults in compartment ${var.security_compartment_path} where target.vault.id='${var.vault_id}'",
    "Allow group ${var.group_name} to use keys in compartment ${var.security_compartment_path} where target.key.id='${var.key_id}'",
  ]
}

output "policy_id" {
  value = oci_identity_policy.monitoring_secret_access.id
}
