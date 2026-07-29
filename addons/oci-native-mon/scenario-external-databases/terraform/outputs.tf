output "external_databases" {
  value = merge(
    { for key, target in oci_database_external_container_database.cdb : key => { id = target.id, database_type = "CDB" } },
    { for key, target in oci_database_external_pluggable_database.pdb : key => { id = target.id, database_type = "PDB" } },
    { for key, target in oci_database_external_non_container_database.non_cdb : key => { id = target.id, database_type = "NON_CDB" } }
  )
}
