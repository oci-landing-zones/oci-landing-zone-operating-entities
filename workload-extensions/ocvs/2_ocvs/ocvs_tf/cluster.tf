resource "oci_ocvp_cluster" "cluster" {
  for_each = var.clusters
  compute_availability_domain = var.availability_domain
  esxi_hosts_count            = var.cluster_esxi_hosts_count
  network_configuration {
    #Required
    nsx_edge_vtep_vlan_id  = oci_core_vlan.test_vlan.id
    nsx_vtep_vlan_id       = oci_core_vlan.test_vlan.id
    provisioning_subnet_id = oci_core_subnet.test_subnet.id
    vmotion_vlan_id        = oci_core_vlan.test_vlan.id
    vsan_vlan_id           = oci_core_vlan.test_vlan.id

    #Optional
    hcx_vlan_id             = oci_core_vlan.test_vlan.id
    nsx_edge_uplink1vlan_id = oci_ocvp_nsx_edge_uplink1vlan.test_nsx_edge_uplink1vlan.id
    nsx_edge_uplink2vlan_id = oci_ocvp_nsx_edge_uplink2vlan.test_nsx_edge_uplink2vlan.id
    provisioning_vlan_id    = oci_core_vlan.test_vlan.id
    replication_vlan_id     = oci_core_vlan.test_vlan.id
    vsphere_vlan_id         = oci_core_vlan.test_vlan.id
  }
  sddc_id = oci_ocvp_sddc.test_sddc.id

  #Optional
  capacity_reservation_id = oci_ocvp_capacity_reservation.test_capacity_reservation.id
  datastores {
    #Required
    block_volume_ids = var.cluster_datastores_block_volume_ids
    datastore_type   = var.cluster_datastores_datastore_type
  }
  defined_tags                 = { "Operations.CostCenter" = "42" }
  display_name                 = var.cluster_display_name
  esxi_software_version        = var.cluster_esxi_software_version
  freeform_tags                = { "Department" = "Finance" }
  initial_commitment           = var.cluster_initial_commitment
  initial_host_ocpu_count      = var.cluster_initial_host_ocpu_count
  initial_host_shape_name      = oci_core_shape.test_shape.name
  instance_display_name_prefix = var.cluster_instance_display_name_prefix
  is_shielded_instance_enabled = var.cluster_is_shielded_instance_enabled
  vmware_software_version      = var.cluster_vmware_software_version
  workload_network_cidr        = var.cluster_workload_network_cidr
}

