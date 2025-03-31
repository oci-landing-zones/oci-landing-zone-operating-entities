resource "oci_core_vlan" "nsx_edge_uplink1_vlan" {
  display_name   = "nsx-edge-uplink 1"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 17)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.nsx_edge_uplink_nsg_id]
  route_table_id = var.internal_rt_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "nsx_edge_uplink2_vlan" {
  display_name   = "nsx-edge-uplink-2"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 18)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.nsx_edge_uplink_nsg_id]
  route_table_id = var.internal_rt_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "nsx_edge_vtep_vlan" {
  display_name   = "nsx-edge-vtep-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 19)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.nsx_edge_vtep_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "nsx_vtep_vlan" {
  display_name   = "nsx-vtep-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 20)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.nsx_vtep_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "vmotion_vlan" {
  display_name   = "vmotion-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 21)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.vmotion_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "vsan_vlan" {
  display_name   = "vsan-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 22)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.vsan_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "vsphere_vlan" {
  display_name   = "vsphere-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 6, 46)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.vsphere_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "hcx_vlan" {
  count          = var.hcx_enabled ? 1 : 0
  display_name   = "hcx-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 6, 47)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.hcx_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "provisioning_vlan" {
  display_name   = "provisioning-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 25)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.provisioning_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}

resource "oci_core_vlan" "replication_vlan" {
  display_name   = "replication-vlan"
  cidr_block     = cidrsubnet(data.oci_core.vcn.ocvs.cidr_blocks[0], 5, 24)
  compartment_id = var.network_compartment_id
  vcn_id         = var.vcn_id
  nsg_ids        = [var.replication_nsg_id]
  route_table_id = var.vlan_route_table_id
  freeform_tags  = var.freeform_tags
}
