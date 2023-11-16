# ####################################################################################################### #
# Copyright (c) 2023 Oracle and/or its affiliates,  All rights reserved.                                  #
# Licensed under the Universal Permissive License v 1.0 as shown at https: //oss.oracle.com/licenses/upl. #
# Author: Cosmin Tudor                                                                                    #
# Author email: cosmin.tudor@oracle.com                                                                   #
# Last Modified: Thu Nov 16 2023                                                                          #
# Modified by: Cosmin Tudor, email: cosmin.tudor@oracle.com                                               #
# ####################################################################################################### #


module "cislz_compartments" {
  source                     = "git::https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//compartments?ref=v0.1.5"
  tenancy_ocid               = var.tenancy_ocid
  compartments_configuration = var.compartments_configuration
  derive_keys_from_hierarchy = var.compartments_configuration != null ? var.compartments_configuration.derive_keys_from_hierarchy != null ? var.compartments_configuration.derive_keys_from_hierarchy : false : false
  module_name                = var.compartments_configuration != null ? var.compartments_configuration.module_name != null ? var.compartments_configuration.module_name : "iam-compartments" : "iam-compartments"
  tags_dependency            = var.compartments_configuration != null ? var.compartments_configuration.tags_dependency != null ? var.compartments_configuration.tags_dependency : null : null
}

module "cislz_groups" {
  source               = "git::https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//groups?ref=v0.1.5"
  tenancy_ocid         = var.tenancy_ocid
  module_name          = var.groups_configuration != null ? var.groups_configuration.module_name != null ? var.groups_configuration.module_name : "iam-groups" : "iam-groups"
  groups_configuration = var.groups_configuration
}

module "cislz_dynamic_groups" {
  source                       = "git::https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//dynamic-groups?ref=v0.1.5"
  tenancy_ocid                 = var.tenancy_ocid
  module_name                  = var.dynamic_groups_configuration != null ? var.dynamic_groups_configuration.module_name != null ? var.dynamic_groups_configuration.module_name : "iam-dynamic-groups" : "iam-dynamic-groups"
  dynamic_groups_configuration = var.dynamic_groups_configuration
}

module "cislz_policies" {
  source                 = "git::https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-iam.git//policies?ref=v0.1.5"
  tenancy_ocid           = var.tenancy_ocid
  policies_configuration = var.policies_configuration
  module_name            = var.policies_configuration != null ? var.policies_configuration.module_name != null ? var.policies_configuration.module_name : "iam-policies" : "iam-policies"
  enable_output          = var.policies_configuration != null ? var.policies_configuration.enable_output != null ? var.policies_configuration.enable_output : false : false
  enable_debug           = var.policies_configuration != null ? var.policies_configuration.enable_debug != null ? var.policies_configuration.enable_debug : false : false
}
