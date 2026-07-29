variable "region" {
  description = "OCI region containing the ExaCC control-plane resources."
  type        = string
}

provider "oci" {
  region = var.region
}
