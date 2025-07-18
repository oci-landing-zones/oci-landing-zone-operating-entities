variable "tenancy_ocid" {
  type = string
  description = "Tenancy ocid"
}

variable "adb_compartment_id" {
  type        = string
  description = "autonomous database compartment ocid"
}

variable "private_subnet_id" {
  type        = string
  description = "private subnet ocid"
}

variable "secret_ocid" {
  type        = string
  description = "OCI secret ocid"
}

variable "autonomous_database_license_model" {
  type        = string
  description = "Autonomous database licence type"
  default     = "LICENSE_INCLUDED"
}

variable "adw_display_name" {
  type = string
  description = "ADW display name"
  default = "FINOPS"
}

variable "adw_db_name" {
  type = string
  description = "ADW database name"
  default = "FINOPS"
}

variable "db_version" {
  type = string
  description = "Database version."
  default = "23ai"
}

variable "finops_dynamic_group_name" {
  type = string
  description = "Finops dynamic groups name"
  default = "FinOps-DG"
}

variable "defined_tags" {
  type = map(string)
  default = {}
  description = "Defined Tags"
}

variable "finops_policy_name" {
  type = string
  description = "Finops policy name"
  default = "FinOps-policy"
}

variable "create_policy" {
  type = bool
  default = false
  description = "Whether to create dynamic group and policy or not"
}

variable "nsg_id" {
  description = "nsg ocid"
}