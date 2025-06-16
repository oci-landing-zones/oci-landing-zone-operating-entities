variable "tenancy_id" {
  type        = string
  description = "Tenancy OCID"
}
variable "fn_compartment_id" {
  type        = string
  description = "function compartment OCID"
}
variable "adb_compartment_id" {
  type        = string
  description = "autonomous database compartment ocid"
}


variable "fn_subnet_id" {
  type        = string
  description = "function subnet id"
}

variable "secret_ocid" {
  type        = string
  description = "OCI secret ocid"
}
variable "fn_app_name" {
  type        = string
  description = "Function application name"
  default     = "finops"
}

variable "repo_display_name" {
  type        = string
  description = "OCI container registry repository name"
  default     = "function/finops"
}

variable "user_name" {
  type        = string
  description = "Username for OCIR registry push"

}

variable "region_code" {
  type        = string
  description = "OCIR Region code"

}

variable "auth_token" {
  type        = string
  description = "Auth token"
  sensitive   = true

}
variable "fn_display_name" {
  type        = string
  default     = "finops-fn"
  description = "Function name"
}

variable "bucket_name" {
  type        = string
  description = "finops bucket name"
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

variable "schedule_display_name" {
  type = string
  description = "Resource scheduler display name used for scheduling the finops function"
  default = "FINOPS-scheduler"
}

variable "db_version" {
  type = string
  description = "Database version."
  default = "23ai"
}