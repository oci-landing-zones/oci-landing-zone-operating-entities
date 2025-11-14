terraform {
  required_version = ">=1.5.7"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "6.2.0"
    }
  }
}

provider "oci" {
  region = var.region
}

provider "oci" {
  region = var.region
  alias  = "home"
}
