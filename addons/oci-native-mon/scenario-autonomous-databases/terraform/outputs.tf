output "autonomous_database_management" {
  description = "ADB DBM action resources keyed by Landing Zone target key."
  value = {
    for key, target in oci_database_management_autonomous_database_autonomous_database_dbm_features_management.this :
    key => {
      id                     = target.id
      autonomous_database_id = local.targets[key].autonomous_database_ocid
    }
  }
}
