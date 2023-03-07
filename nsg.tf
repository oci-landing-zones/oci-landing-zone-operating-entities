resource "oci_core_network_security_group" "simple_nsg" {
  #Required
  compartment_id = var.compartment_ocid
  vcn_id         = local.use_existing_network ? var.vcn_id : oci_core_vcn.simple.0.id

  #Optional
  display_name = var.nsg_display_name

  freeform_tags = {(var.tag_key_name) = (var.tag_value)}
}

# Allow Egress traffic to all networks
resource "oci_core_network_security_group_security_rule" "simple_rule_egress" {
  network_security_group_id = oci_core_network_security_group.simple_nsg.id

  direction   = "EGRESS"
  protocol    = "all"
  destination = "0.0.0.0/0"

}

# Allow SSH (TCP port 22) Ingress traffic from any network
resource "oci_core_network_security_group_security_rule" "simple_rule_ssh_ingress" {
  network_security_group_id = oci_core_network_security_group.simple_nsg.id
  protocol                  = "6"
  direction                 = "INGRESS"
  source                    = var.nsg_source_cidr
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = var.nsg_ssh_port
      max = var.nsg_ssh_port
    }
  }
}

# Allow HTTPS (TCP port 443) Ingress traffic from any network
resource "oci_core_network_security_group_security_rule" "simple_rule_https_ingress" {
  network_security_group_id = oci_core_network_security_group.simple_nsg.id
  protocol                  = "6"
  direction                 = "INGRESS"
  source                    = var.nsg_source_cidr
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = var.nsg_https_port
      max = var.nsg_https_port
    }
  }
}

# Allow HTTP (TCP port 80) Ingress traffic from any network
resource "oci_core_network_security_group_security_rule" "simple_rule_http_ingress" {
  network_security_group_id = oci_core_network_security_group.simple_nsg.id
  protocol                  = "6"
  direction                 = "INGRESS"
  source                    = var.nsg_source_cidr
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = var.nsg_http_port
      max = var.nsg_http_port
    }
  }
}

# Allow ANY Ingress traffic from within simple vcn
resource "oci_core_network_security_group_security_rule" "simple_rule_all_simple_vcn_ingress" {
  network_security_group_id = oci_core_network_security_group.simple_nsg.id
  protocol                  = "all"
  direction                 = "INGRESS"
  source                    = var.vcn_cidr_block
  stateless                 = false
}
