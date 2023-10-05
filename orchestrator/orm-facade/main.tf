module "terraform-oci-open-lz" {
  source = "../"

  tenancy_ocid = var.tenancy_ocid
  home_region  = var.home_region
  user_ocid    = var.user_ocid

  compartments_configuration   = local.compartments_configuration_from_input_json_yaml_file
  groups_configuration         = local.groups_configuration_from_input_json_yaml_file
  dynamic_groups_configuration = local.dynamic_groups_configuration_from_input_json_yaml_file
  policies_configuration       = local.policies_configuration_from_input_json_yaml_file
  network_configuration        = local.network_configuration_from_input_json_yaml_file
}