locals {
  targets = {
    for key, target in var.autonomous_database_dbm_configuration.targets : key => merge(target, {
      autonomous_database_ocid = var.autonomous_databases_dependency[target.autonomous_database_id].id
      private_endpoint_ocid    = var.dbm_private_endpoints_dependency[target.private_endpoint_id].id
      password_secret_ocid     = var.vault_secrets_dependency[target.password_secret_id].id
    })
  }
}

resource "oci_database_management_autonomous_database_autonomous_database_dbm_features_management" "this" {
  for_each = local.targets

  autonomous_database_id                 = each.value.autonomous_database_ocid
  enable_autonomous_database_dbm_feature = each.value.enable_database_management

  feature_details {
    feature = "DIAGNOSTICS_AND_MANAGEMENT"

    connector_details {
      connector_type       = "PE"
      private_end_point_id = each.value.private_endpoint_ocid
    }

    database_connection_details {
      connection_credentials {
        credential_type    = "DETAILS"
        password_secret_id = each.value.password_secret_ocid
        role               = upper(each.value.role)
        user_name          = each.value.user_name
      }

      connection_string {
        connection_type = "BASIC"
        port            = each.value.port
        protocol        = upper(each.value.protocol)
        service         = each.value.service_name
      }
    }
  }
}
