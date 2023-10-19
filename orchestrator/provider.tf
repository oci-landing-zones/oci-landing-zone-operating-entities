# Copyright (c) 2023, Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

provider "oci" {
  region               = var.home_region
  tenancy_ocid         = var.tenancy_ocid
  user_ocid            = var.user_ocid
  fingerprint          = var.fingerprint
  private_key_path     = var.private_key_path
  private_key_password = var.private_key_password
}

terraform {
  required_version = "< 1.3.0"
  required_providers {
    oci = {
      source                = "oracle/oci"
      version               = "<= 5.16.0"
      configuration_aliases = [oci]
    }
  }
  experiments = [module_variable_optional_attrs]
}