resource "oci_core_vcn" "simple" {
  count          = local.use_existing_network ? 0 : 1
  cidr_block     = var.vcn_cidr_block
  dns_label      = substr(var.vcn_dns_label, 0, 15)
  compartment_id = var.compartment_ocid
  display_name   = var.vcn_display_name

  freeform_tags = {(var.tag_key_name) = (var.tag_value)}
}

#IGW
resource "oci_core_internet_gateway" "simple_internet_gateway" {
  count          = local.use_existing_network ? 0 : 1
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.simple[count.index].id
  enabled        = "true"
  display_name   = "${var.vcn_display_name}-igw"

  freeform_tags = {(var.tag_key_name) = (var.tag_value)}
}

#simple subnet
resource "oci_core_subnet" "simple_subnet" {
  count                      = local.use_existing_network ? 0 : 1
  cidr_block                 = var.subnet_cidr_block
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.simple[count.index].id
  display_name               = var.subnet_display_name
  dns_label                  = substr(var.subnet_dns_label, 0, 15)
  prohibit_public_ip_on_vnic = ! local.is_public_subnet

  freeform_tags = {(var.tag_key_name) = (var.tag_value)}
}

resource "oci_core_route_table" "simple_route_table" {
  count          = local.use_existing_network ? 0 : 1
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.simple[count.index].id
  display_name   = "${var.subnet_display_name}-rt"

  route_rules {
    network_entity_id = oci_core_internet_gateway.simple_internet_gateway[count.index].id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }

  freeform_tags = {(var.tag_key_name) = (var.tag_value)}
}

resource "oci_core_route_table_attachment" "route_table_attachment" {
  count          = local.use_existing_network ? 0 : 1
  subnet_id      = oci_core_subnet.simple_subnet[count.index].id
  route_table_id = oci_core_route_table.simple_route_table[count.index].id
}
