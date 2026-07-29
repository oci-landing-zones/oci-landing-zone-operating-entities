variable "external_database_management_configuration" {
  description = "External database registrations and DBM feature configuration."
  type = object({
    operation_stage = optional(string, "ENABLE")
    targets = map(object({
      compartment_id      = string
      display_name        = string
      database_type       = string
      parent_database_key = optional(string)
      management_agent_id = string
      defined_tags        = optional(map(string), {})
      freeform_tags       = optional(map(string), {})
    }))
  })

  validation {
    condition = contains(
      ["ENABLE", "DISABLE_TARGETS", "DISABLE_CDB"],
      upper(var.external_database_management_configuration.operation_stage)
    )
    error_message = "External database operation_stage must be ENABLE, DISABLE_TARGETS, or DISABLE_CDB."
  }

  validation {
    condition = alltrue([
      for target in values(var.external_database_management_configuration.targets) :
      contains(["CDB", "PDB", "NON_CDB"], upper(target.database_type))
    ])
    error_message = "External database_type must be CDB, PDB, or NON_CDB."
  }

  validation {
    condition = alltrue([
      for key, target in var.external_database_management_configuration.targets :
      upper(target.database_type) != "PDB" || (
        try(target.parent_database_key, null) != null &&
        contains(keys(var.external_database_management_configuration.targets), target.parent_database_key) &&
        upper(try(var.external_database_management_configuration.targets[target.parent_database_key].database_type, "")) == "CDB"
      )
    ])
    error_message = "Every external PDB must reference a CDB target in the same configuration."
  }
}

variable "compartments_dependency" {
  type = map(object({ id = string }))
}

variable "management_agents_dependency" {
  type = map(object({ id = string }))
}
