resource "oci_ocvp_sddc" "sddc" {
  compartment_id          = var.ocvs_compartment_id
  ssh_authorized_keys     = var.ssh_authorized_keys_pub
  display_name            = var.sddc_display_name
  vmware_software_version = var.vmware_software_version
  freeform_tags           = var.freeform_tags_sddc
  defined_tags            = var.defined_tags_sddc
  is_single_host_sddc     = var.single_host_sddc_enabled
  hcx_action              = var.hcx_action
  is_hcx_enabled          = var.hcx_enabled
  initial_configuration {
    initial_cluster_configurations {
      display_name                = var.sddc_display_name
      compute_availability_domain = var.availability_domain
      esxi_hosts_count            = var.esxi_hosts_count
      # WTF is this???
      vsphere_type                 = var.vsphere_type
      workload_network_cidr        = var.workload_network_cidr
      initial_commitment           = var.initial_commitment
      initial_host_ocpu_count      = var.initial_host_ocpu_count
      initial_host_shape_name      = var.initial_host_shape_name
      instance_display_name_prefix = var.instance_name_prefix
      is_shielded_instance_enabled = var.shielded_instances_enabled
      capacity_reservation_id      = var.capacity_reservation_id
      dynamic "datastores" {
        for_each = toset(var.block_volume_ids)
        content {
          block_volume_ids = var.block_volume_ids
          # What are the types?
          datastore_type = var.datastore_type
        }
      }
      network_configuration {
        nsx_edge_vtep_vlan_id   = oci_core_vlan.nsx_edge_vtep_vlan.id
        nsx_vtep_vlan_id        = oci_core_vlan.nsx_vtep_vlan.id
        provisioning_subnet_id  = var.provisioning_subnet_id
        vmotion_vlan_id         = oci_core_vlan.vmotion_vlan.id
        vsan_vlan_id            = oci_core_vlan.vsan_vlan.id
        hcx_vlan_id             = var.hcx_enabled ? oci_core_vlan.hcx_vlan[0].id : null
        nsx_edge_uplink1vlan_id = oci_core_vlan.nsx_edge_uplink1_vlan.id
        nsx_edge_uplink2vlan_id = oci_core_vlan.nsx_edge_uplink2_vlan.id
        provisioning_vlan_id    = oci_core_vlan.provisioning_vlan.id
        replication_vlan_id     = oci_core_vlan.replication_vlan.id
        vsphere_vlan_id         = oci_core_vlan.vsphere_vlan.id
      }
    }
  }
}
