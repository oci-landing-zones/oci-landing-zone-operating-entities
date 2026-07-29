locals {
  operation_stage = upper(var.exacc_database_management_configuration.operation_stage)
  targets = {
    for key, target in var.exacc_database_management_configuration.targets : key => merge(target, {
      compartment_ocid      = var.compartments_dependency[target.compartment_id].id
      management_agent_ocid = var.management_agents_dependency[target.management_agent_id].id
      database_type         = upper(target.database_type)
    })
  }
  cdb_targets = {
    for key, target in local.targets : key => target if target.database_type == "CDB"
  }
  pdb_targets = {
    for key, target in local.targets : key => target if target.database_type == "PDB"
  }
  non_cdb_targets = {
    for key, target in local.targets : key => target if target.database_type == "NON_CDB"
  }
}

resource "oci_management_agent_management_agent_install_key" "this" {
  for_each = var.exacc_database_management_configuration.install_keys

  compartment_id            = var.compartments_dependency[each.value.compartment_id].id
  display_name              = each.value.display_name
  allowed_key_install_count = each.value.allowed_key_install_count
  is_unlimited              = false
  time_expires              = each.value.time_expires
}

resource "oci_database_external_container_database" "cdb" {
  for_each = local.cdb_targets

  compartment_id = each.value.compartment_ocid
  display_name   = each.value.display_name
  defined_tags   = each.value.defined_tags
  freeform_tags  = each.value.freeform_tags
}

resource "oci_database_external_pluggable_database" "pdb" {
  for_each = local.pdb_targets

  compartment_id                 = each.value.compartment_ocid
  display_name                   = each.value.display_name
  external_container_database_id = oci_database_external_container_database.cdb[each.value.parent_database_key].id
  defined_tags                   = each.value.defined_tags
  freeform_tags                  = each.value.freeform_tags
}

resource "oci_database_external_non_container_database" "non_cdb" {
  for_each = local.non_cdb_targets

  compartment_id = each.value.compartment_ocid
  display_name   = each.value.display_name
  defined_tags   = each.value.defined_tags
  freeform_tags  = each.value.freeform_tags
}

resource "oci_database_management_externalcontainerdatabase_external_container_dbm_features_management" "cdb" {
  for_each = local.cdb_targets

  external_container_database_id        = oci_database_external_container_database.cdb[each.key].id
  enable_external_container_dbm_feature = local.operation_stage != "DISABLE_CDB"

  feature_details {
    feature                           = "DIAGNOSTICS_AND_MANAGEMENT"
    can_enable_all_current_pdbs       = false
    is_auto_enable_pluggable_database = false

    connector_details {
      connector_type      = "MACS"
      management_agent_id = each.value.management_agent_ocid
    }
  }
}

resource "oci_database_management_externalpluggabledatabase_external_pluggable_dbm_features_management" "pdb" {
  for_each = local.pdb_targets

  external_pluggable_database_id        = oci_database_external_pluggable_database.pdb[each.key].id
  enable_external_pluggable_dbm_feature = local.operation_stage == "ENABLE"

  feature_details {
    feature = "DIAGNOSTICS_AND_MANAGEMENT"

    connector_details {
      connector_type      = "MACS"
      management_agent_id = each.value.management_agent_ocid
    }
  }

  depends_on = [
    oci_database_management_externalcontainerdatabase_external_container_dbm_features_management.cdb
  ]
}

resource "oci_database_management_externalnoncontainerdatabase_external_non_container_dbm_features_management" "non_cdb" {
  for_each = local.non_cdb_targets

  external_non_container_database_id        = oci_database_external_non_container_database.non_cdb[each.key].id
  enable_external_non_container_dbm_feature = local.operation_stage == "ENABLE"

  feature_details {
    feature                           = "DIAGNOSTICS_AND_MANAGEMENT"
    can_enable_all_current_pdbs       = false
    is_auto_enable_pluggable_database = false

    connector_details {
      connector_type      = "MACS"
      management_agent_id = each.value.management_agent_ocid
    }
  }
}
