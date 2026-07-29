variable "region" {
  description = "OCI region for this rollout wave."
  type        = string
}

provider "oci" {
  region = var.region
}
