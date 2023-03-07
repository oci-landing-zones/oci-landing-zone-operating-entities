locals {

  # Logic to use AD name provided by user input on ORM or to lookup for the AD name when running from CLI
  availability_domain = (var.availability_domain_name != "" ? var.availability_domain_name : data.oci_identity_availability_domain.ad.name)

  # local.use_existing_network referenced in network.tf
  use_existing_network = var.network_strategy == var.network_strategy_enum["USE_EXISTING_VCN_SUBNET"] ? true : false

  # local.is_public_subnet referenced in compute.tf
  is_public_subnet = var.subnet_type == var.subnet_type_enum["PUBLIC_SUBNET"] ? true : false

  # Logic to select Oracle Autonomous Linux 7 platform image (version pegged in data source filter)
  platform_image_id = data.oci_core_images.autonomous_ol7.images[0].id

  # Logic to choose a custom image or a marketplace image.
  compute_image_id = var.mp_subscription_enabled ? var.mp_listing_resource_id : var.custom_image_id

  # Local to control subscription to Marketplace image.
  mp_subscription_enabled = var.mp_subscription_enabled ? 1 : 0

  # Marketplace Image listing variables - required for subscription only
  listing_id               = var.mp_listing_id
  listing_resource_id      = var.mp_listing_resource_id
  listing_resource_version = var.mp_listing_resource_version

  
  is_flex_shape = var.vm_compute_shape == "VM.Standard.E3.Flex" ? [var.vm_flex_shape_ocpus]:[]
    
}
