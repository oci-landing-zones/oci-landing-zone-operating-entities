variable "database_observability_configuration" {
  description = "Base Database DBM configuration using Landing Zone dependency keys."
  type        = any
}

variable "compartments_dependency" {
  type    = any
  default = {}
}
variable "vcns_dependency" {
  type    = any
  default = {}
}
variable "subnets_dependency" {
  type    = any
  default = {}
}
variable "network_security_groups_dependency" {
  type    = any
  default = {}
}
variable "databases_dependency" {
  type    = any
  default = {}
}
variable "managed_databases_dependency" {
  type    = any
  default = {}
}
variable "vault_secrets_dependency" {
  type    = any
  default = {}
}
variable "dbm_private_endpoints_dependency" {
  type    = any
  default = {}
}
variable "opsi_private_endpoints_dependency" {
  type    = any
  default = {}
}
