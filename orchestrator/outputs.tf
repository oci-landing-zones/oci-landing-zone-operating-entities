# Copyright (c) 2023 Oracle and/or its affiliates.
# Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.


output "provisioned_identity_resources" {
  description = "Provisioned identity resources"
  value = {
    compartments   = module.cislz_compartments.compartments,
    groups         = module.cislz_groups.groups,
    dynamic_groups = module.cislz_dynamic_groups.dynamic_groups,
    memberships    = module.cislz_groups.memberships,
    policies       = module.cislz_policies.policies

  }
}

output "provisioned_networking_resources" {
  description = "Provisioned networking resources"
  value       = module.terraform-oci-cis-landing-zone-network.provisioned_networking_resources
}