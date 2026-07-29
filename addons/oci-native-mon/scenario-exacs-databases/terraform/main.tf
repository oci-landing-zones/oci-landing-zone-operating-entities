module "database_management" {
  # terraform-oci-database-observability v0.3.1 release commit.
  source = "github.com/adibirzu/terraform-oci-database-observability?ref=1e54f354f6a79fd0279f95413b88aed75013bdc7"

  database_observability_configuration = var.database_observability_configuration
  compartments_dependency              = var.compartments_dependency
  vcns_dependency                      = var.vcns_dependency
  subnets_dependency                   = var.subnets_dependency
  network_security_groups_dependency   = var.network_security_groups_dependency
  databases_dependency                 = var.databases_dependency
  managed_databases_dependency         = var.managed_databases_dependency
  vault_secrets_dependency             = var.vault_secrets_dependency
  dbm_private_endpoints_dependency     = var.dbm_private_endpoints_dependency
  opsi_private_endpoints_dependency    = var.opsi_private_endpoints_dependency
}
