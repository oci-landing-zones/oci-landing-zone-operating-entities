# Copyright (c) 2023, Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.


module "cislz_compartments" {
  source                     = "git@github.com:oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//compartments?ref=v0.1.3"
  tenancy_ocid               = var.tenancy_ocid
  compartments_configuration = var.compartments_configuration
}

module "cislz_groups" {
  source               = "git@github.com:oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//groups?ref=v0.1.3"
  tenancy_ocid         = var.tenancy_ocid
  groups_configuration = var.groups_configuration
}

module "cislz_dynamic_groups" {
  source                       = "git@github.com:oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//dynamic-groups?ref=v0.1.3"
  tenancy_ocid                 = var.tenancy_ocid
  dynamic_groups_configuration = var.dynamic_groups_configuration
}

module "cislz_policies" {
  source                 = "git@github.com:oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//policies?ref=v0.1.3"
  tenancy_ocid           = var.tenancy_ocid
  policies_configuration = var.policies_configuration
}
