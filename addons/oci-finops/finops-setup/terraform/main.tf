provider "oci" {}

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 7.2"
    }
  }
  required_version = ">= 1.0.0 ,<1.6.0"
}

#To create ADB with private endpoint
resource "oci_database_autonomous_database" "autonomous_database_private" {

  secret_id                = var.secret_ocid
  compartment_id           = var.adb_compartment_id
  compute_count            = 1
  compute_model            = "ECPU"
  data_storage_size_in_tbs = "1"
  db_name                  = var.adw_db_name

  db_version   = var.db_version
  display_name = var.adw_display_name
  is_auto_scaling_enabled             = "true"
  is_auto_scaling_for_storage_enabled = "true"
  license_model                       = var.autonomous_database_license_model
  subnet_id = var.private_subnet_id 
  nsg_ids = [var.nsg_id]
}

locals {
  adw_ocid = oci_database_autonomous_database.autonomous_database_private.id
  dynamic_group_rule = "ALL {resource.type = 'autonomousdatabase',resource.id='${local.adw_ocid}'}"
  policy_statements = ["define tenancy reporting as ocid1.tenancy.oc1..aaaaaaaaned4fkpkisbwjlr56u7cj63lf3wffbilvqknstgtvzub7vhqkggq",
  "endorse dynamic-group ${var.finops_dynamic_group_name} to read objects in tenancy reporting"]
}

#To create dynamic group
resource "oci_identity_dynamic_group" "finops_dynamic_group" {
    count = var.create_policy ? 1 : 0
    depends_on = [ oci_database_autonomous_database.autonomous_database_private ]
    compartment_id = var.tenancy_ocid
    description = "Dynamic group for FinOps Autonomous database"
    matching_rule = local.dynamic_group_rule
    name = var.finops_dynamic_group_name
    defined_tags = var.defined_tags
}

# To create IAM policies
resource "oci_identity_policy" "finops_policy" {
    count = var.create_policy ? 1 : 0
    compartment_id = var.tenancy_ocid
    description = "FinOps policies to read objects from cost tenancy"
    name = var.finops_policy_name
    statements = local.policy_statements
    defined_tags = var.defined_tags
}