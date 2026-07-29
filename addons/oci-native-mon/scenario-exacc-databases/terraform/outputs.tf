output "management_agent_install_keys" {
  description = "Install-key identifiers only. Secret key values are not output."
  value = {
    for key, install_key in oci_management_agent_management_agent_install_key.this :
    key => {
      id = install_key.id
    }
  }
}

output "external_databases" {
  description = "Registered ExaCC database identities keyed by LZ key."
  value = merge(
    { for key, target in oci_database_external_container_database.cdb : key => { id = target.id, database_type = "CDB" } },
    { for key, target in oci_database_external_pluggable_database.pdb : key => { id = target.id, database_type = "PDB" } },
    { for key, target in oci_database_external_non_container_database.non_cdb : key => { id = target.id, database_type = "NON_CDB" } }
  )
}
