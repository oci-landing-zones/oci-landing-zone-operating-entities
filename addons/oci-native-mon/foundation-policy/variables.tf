variable "region" {
  type = string
}

variable "policy_compartment_id" {
  description = "Compartment OCID where the IAM policy is created, usually the tenancy root."
  type        = string
}

variable "policy_name" {
  type    = string
  default = "pcy-lzp-database-observability-secret-access"
}

variable "group_name" {
  type    = string
  default = "grp-lzp-mon-admins"
}

variable "security_compartment_path" {
  description = "IAM policy compartment path containing the reviewed Vault and key."
  type        = string
}

variable "vault_id" {
  type = string
  validation {
    condition     = can(regex("^ocid1\\.vault\\.", var.vault_id))
    error_message = "vault_id must be an OCI Vault OCID."
  }
}

variable "key_id" {
  type = string
  validation {
    condition     = can(regex("^ocid1\\.key\\.", var.key_id))
    error_message = "key_id must be an OCI Key OCID."
  }
}
