variable "region" {
  type = string
}

provider "oci" {
  region = var.region
}
