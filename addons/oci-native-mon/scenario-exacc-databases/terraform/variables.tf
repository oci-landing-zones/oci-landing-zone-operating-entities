variable "exacc_database_management_configuration" {
  description = "ExaCC external database registrations and DBM feature configuration."
  type = object({
    operation_stage = optional(string, "ENABLE")
    install_keys = optional(map(object({
      compartment_id            = string
      display_name              = string
      allowed_key_install_count = optional(number, 1)
      time_expires              = optional(string)
    })), {})
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
      upper(var.exacc_database_management_configuration.operation_stage)
    )
    error_message = "ExaCC operation_stage must be ENABLE, DISABLE_TARGETS, or DISABLE_CDB."
  }

  validation {
    condition = alltrue([
      for target in values(var.exacc_database_management_configuration.targets) :
      contains(["CDB", "PDB", "NON_CDB"], upper(target.database_type))
    ])
    error_message = "ExaCC database_type must be CDB, PDB, or NON_CDB."
  }

  validation {
    condition = alltrue([
      for key, target in var.exacc_database_management_configuration.targets :
      upper(target.database_type) != "PDB" || (
        try(target.parent_database_key, null) != null &&
        contains(keys(var.exacc_database_management_configuration.targets), target.parent_database_key) &&
        upper(try(var.exacc_database_management_configuration.targets[target.parent_database_key].database_type, "")) == "CDB"
      )
    ])
    error_message = "Every ExaCC PDB must reference a CDB target in the same configuration."
  }
}

variable "compartments_dependency" {
  description = "Compartments produced by the Landing Zone composition."
  type        = map(object({ id = string }))
}

variable "management_agents_dependency" {
  description = "Management Agents installed on ExaCC VM Cluster nodes."
  type        = map(object({ id = string }))
}
