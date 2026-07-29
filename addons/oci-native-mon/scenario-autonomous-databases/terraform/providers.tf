variable "region" {
  description = "OCI region containing the Autonomous Databases."
  type        = string
}

provider "oci" {
  region = var.region
}
