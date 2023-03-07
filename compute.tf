resource "oci_core_instance" "simple-vm" {
  availability_domain = local.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = var.vm_display_name
  shape               = var.vm_compute_shape

  dynamic "shape_config" {
    for_each = local.is_flex_shape
      content {
        ocpus = shape_config.value
      }
  }


  create_vnic_details {
    subnet_id              = local.use_existing_network ? var.subnet_id : oci_core_subnet.simple_subnet[0].id
    display_name           = var.subnet_display_name
    assign_public_ip       = local.is_public_subnet
    hostname_label         = var.hostname_label
    skip_source_dest_check = false
    nsg_ids                = [oci_core_network_security_group.simple_nsg.id]
  }

  source_details {
    source_type = "image"
    source_id   = local.platform_image_id
    #use a marketplace image or custom image:
    #source_id   = local.compute_image_id
  }

  lifecycle {
    ignore_changes = [
      source_details[0].source_id
    ]
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("./scripts/example.sh"))
  }

  freeform_tags = {(var.tag_key_name) = (var.tag_value)}
}
