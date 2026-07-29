output "dbm_private_endpoints" {
  value = module.database_observability.dbm_private_endpoints
}

output "opsi_private_endpoints" {
  value = module.database_observability.opsi_private_endpoints
}

output "database_management" {
  value = module.database_observability.database_management
}

output "database_insights" {
  value = module.database_observability.database_insights
}

output "operation_receipt" {
  value = module.database_observability.operation_receipt
}
