variable "autonomous_database_dbm_configuration" {
  description = "Landing Zone keys and DBM connection configuration for Autonomous Databases."
  type = object({
    targets = map(object({
      autonomous_database_id     = string
      private_endpoint_id        = string
      password_secret_id         = string
      service_name               = string
      user_name                  = optional(string, "ADBSNMP")
      role                       = optional(string, "NORMAL")
      protocol                   = optional(string, "TCP")
      port                       = optional(number, 1522)
      enable_database_management = optional(bool, true)
    }))
  })

  validation {
    condition = alltrue([
      for target in values(var.autonomous_database_dbm_configuration.targets) :
      contains(["TCP", "TCPS"], upper(target.protocol)) &&
      target.port >= 1 && target.port <= 65535
    ])
    error_message = "ADB protocol must be TCP or TCPS and port must be 1-65535."
  }
}

variable "autonomous_databases_dependency" {
  description = "Autonomous Databases produced by the Landing Zone composition."
  type        = map(object({ id = string }))
}

variable "dbm_private_endpoints_dependency" {
  description = "DBM private endpoints produced by the Landing Zone composition."
  type        = map(object({ id = string }))
}

variable "vault_secrets_dependency" {
  description = "Vault secrets produced by the Landing Zone security composition."
  type        = map(object({ id = string }))
}
