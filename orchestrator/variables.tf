# ####################################################################################################### #
# Copyright (c) 2023 Oracle and/or its affiliates,  All rights reserved.                                  #
# Licensed under the Universal Permissive License v 1.0 as shown at https: //oss.oracle.com/licenses/upl. #
# Author: Cosmin Tudor                                                                                    #
# Author email: cosmin.tudor@oracle.com                                                                   #
# Last Modified: Tue Nov 21 2023                                                                          #
# Modified by: Cosmin Tudor, email: cosmin.tudor@oracle.com                                               #
# ####################################################################################################### #

# User Credentials 
variable "tenancy_ocid" {
  type    = string
  default = null
}
variable "user_ocid" {
  type    = string
  default = null
}
variable "fingerprint" {
  type    = string
  default = null
}
variable "private_key_path" {
  type    = string
  default = null
}
variable "private_key_password" {
  type    = string
  default = null
}
variable "home_region" {
  type    = string
  default = null
}


# Compartments Input Variable. Complex object with 6 hieararchial maps
variable "compartments_configuration" {
  description = "The compartments configuration. Use the compartments attribute to define your topology. OCI supports compartment hierarchies up to six levels."
  type = object({
    derive_keys_from_hierarchy = optional(bool)        # Whether identifying keys should be derived from the provided compartments hierarchy
    module_name                = optional(string)      # The module name.
    tags_dependency            = optional(map(any))    #  Map of objects containing the externally managed tags this module may depend on. All map objects must have the same type and must contain at least an 'id' attribute (representing the tag OCID) of string type.
    default_parent_ocid        = optional(string)      # the default parent for all top (first level) compartments. Use parent_ocid attribute within each compartment to specify different parents.
    default_defined_tags       = optional(map(string)) # applies to all compartments, unless overriden by defined_tags in a compartment object
    default_freeform_tags      = optional(map(string)) # applies to all compartments, unless overriden by freeform_tags in a compartment object
    enable_delete              = optional(bool)        # whether or not compartments are physically deleted when destroyed. Default is false.
    compartments = map(object({
      name          = string
      description   = string
      parent_ocid   = optional(string)
      defined_tags  = optional(map(string))
      freeform_tags = optional(map(string))
      tag_defaults = optional(map(object({
        tag_id           = string,
        default_value    = string,
        is_user_required = optional(bool)
      })))
      children = optional(map(object({
        name          = string
        description   = string
        defined_tags  = optional(map(string))
        freeform_tags = optional(map(string))
        tag_defaults = optional(map(object({
          tag_id           = string,
          default_value    = string,
          is_user_required = optional(bool)
        })))
        children = optional(map(object({
          name          = string
          description   = string
          defined_tags  = optional(map(string))
          freeform_tags = optional(map(string))
          tag_defaults = optional(map(object({
            tag_id           = string,
            default_value    = string,
            is_user_required = optional(bool)
          })))
          children = optional(map(object({
            name          = string
            description   = string
            defined_tags  = optional(map(string))
            freeform_tags = optional(map(string))
            tag_defaults = optional(map(object({
              tag_id           = string,
              default_value    = string,
              is_user_required = optional(bool)
            })))
            children = optional(map(object({
              name          = string
              description   = string
              defined_tags  = optional(map(string))
              freeform_tags = optional(map(string))
              tag_defaults = optional(map(object({
                tag_id           = string,
                default_value    = string,
                is_user_required = optional(bool)
              })))
              children = optional(map(object({
                name          = string
                description   = string
                defined_tags  = optional(map(string))
                freeform_tags = optional(map(string))
                tag_defaults = optional(map(object({
                  tag_id           = string,
                  default_value    = string,
                  is_user_required = optional(bool)
                })))
              })))
            })))
          })))
        })))
      })))
    }))
  })
  default = null
}

# Groups Input Variable. Complex object with one Map.
variable "groups_configuration" {
  description = "The groups configuration."
  type = object({
    module_name           = optional(string) # The module name.
    default_defined_tags  = optional(map(string)),
    default_freeform_tags = optional(map(string))
    groups = map(object({
      name          = string,
      description   = string,
      members       = optional(list(string)),
      defined_tags  = optional(map(string)),
      freeform_tags = optional(map(string))
    }))
  })
  default = null
}

# Dynamic Groups Input Variable. Complex object with one Map.
variable "dynamic_groups_configuration" {
  description = "The dynamic groups."
  type = object({
    module_name           = optional(string) # The module name.
    default_defined_tags  = optional(map(string)),
    default_freeform_tags = optional(map(string))
    dynamic_groups = map(object({
      name          = string,
      description   = string,
      matching_rule = string
      defined_tags  = optional(map(string)),
      freeform_tags = optional(map(string))
    }))
  })
  default = null
}


# Policies Input Variable. Complex object.
variable "policies_configuration" {
  description = "Policies configuration"
  type = object({
    enable_output               = optional(bool)   # Whether Terraform should enable module output.
    enable_debug                = optional(bool)   # Whether Terraform should enable module debug information.
    module_name                 = optional(string) # The module name.
    enable_cis_benchmark_checks = optional(bool)   # Whether to check policies for CIS Foundations Benchmark recommendations. Default is true.
    supplied_policies = optional(map(object({      # A map of directly supplied policies. Use this to suplement or override the template policies.
      name             = string
      description      = string
      compartment_ocid = string
      statements       = list(string)
      defined_tags     = optional(map(string))
      freeform_tags    = optional(map(string))
    })))
    template_policies = optional(object({                        # An object describing the template policies. In this mode, policies are derived according to tenancy_level_settings and compartment_level_settings.
      tenancy_level_settings = optional(object({                 # Settings for tenancy level (Root compartment) policies generation.
        groups_with_tenancy_level_roles = optional(list(object({ # A list of group names and their roles at the tenancy level. Template policies are granted to each group in the Root compartment.
          name  = string
          roles = string
        })))
        oci_services = optional(object({
          enable_all_policies            = optional(bool)
          enable_scanning_policies       = optional(bool)
          enable_cloud_guard_policies    = optional(bool)
          enable_os_management_policies  = optional(bool)
          enable_block_storage_policies  = optional(bool)
          enable_file_storage_policies   = optional(bool)
          enable_oke_policies            = optional(bool)
          enable_streaming_policies      = optional(bool)
          enable_object_storage_policies = optional(bool)
        }))
        policy_name_prefix = optional(string) # A prefix to Root compartment policy names.
      }))
      compartment_level_settings = optional(object({  # Settings for compartment (non Root) level policies generation.
        supplied_compartments = optional(map(object({ # List of compartments that are policy targets.
          name           = string                     # The compartment name
          ocid           = string                     # The compartment ocid
          cislz_metadata = map(string)                # The compartment metadata. See module README.md for details.
        })))
        #policy_name_prefix = optional(string) # A prefix to compartment policy names.
      }))
    }))
    policy_name_prefix = optional(string)      # A prefix to all policy names.
    policy_name_suffix = optional(string)      # A suffix to all policy names.
    defined_tags       = optional(map(string)) # Any defined tags to apply on the template (pre-configured) policies.
    freeform_tags      = optional(map(string)) # Any freeform tags to apply on the template (pre-configured) policies.
  })
  default = null
}

# Network Input Variable. 
# Map of Categories
variable "network_configuration" {
  type = object({
    default_compartment_id     = optional(string),
    default_compartment_key    = optional(string),
    default_defined_tags       = optional(map(string)),
    default_freeform_tags      = optional(map(string)),
    default_enable_cis_checks  = optional(bool),
    default_ssh_ports_to_check = optional(list(number)),

    network_configuration_categories = optional(map(object({
      category_compartment_id     = optional(string),
      category_compartment_key    = optional(string),
      category_defined_tags       = optional(map(string)),
      category_freeform_tags      = optional(map(string)),
      category_enable_cis_checks  = optional(bool),
      category_ssh_ports_to_check = optional(list(number)),

      vcns = optional(map(object({
        compartment_id  = optional(string),
        compartment_key = optional(string),
        display_name    = optional(string),
        byoipv6cidr_details = optional(map(object({
          byoipv6range_id = string
          ipv6cidr_block  = string
        })))
        ipv6private_cidr_blocks          = optional(list(string)),
        is_ipv6enabled                   = optional(bool),
        is_oracle_gua_allocation_enabled = optional(bool),
        cidr_blocks                      = optional(list(string)),
        dns_label                        = optional(string),
        block_nat_traffic                = optional(bool),
        defined_tags                     = optional(map(string)),
        freeform_tags                    = optional(map(string)),

        default_security_list = optional(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          ingress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            src          = string,
            src_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          }))),
          egress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            dst          = string,
            dst_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          })))
        }))

        security_lists = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          display_name    = optional(string),
          ingress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            src          = string,
            src_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          }))),
          egress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            dst          = string,
            dst_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          })))
        })))

        default_route_table = optional(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          display_name    = optional(string),
          route_rules = optional(map(object({
            network_entity_id  = optional(string),
            network_entity_key = optional(string),
            description        = optional(string),
            // Supported values:
            //    - "a cidr block"
            //    - "objectstorage" or "all-services" - only for "SERVICE_CIDR_BLOCK"
            destination = optional(string),
            // Supported values:
            //    - "CIDR_BLOCK"
            //    - "SERVICE_CIDR_BLOCK" - only for SGW
            destination_type = optional(string),
          })))
        }))

        route_tables = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          display_name    = optional(string),
          route_rules = optional(map(object({
            network_entity_id  = optional(string),
            network_entity_key = optional(string),
            description        = optional(string),
            // Supported values:
            //    - "a cidr block"
            //    - "objectstorage" or "all-services" - only for "SERVICE_CIDR_BLOCK"
            destination = optional(string),
            // Supported values:
            //    - "CIDR_BLOCK"
            //    - "SERVICE_CIDR_BLOCK" - only for SGW
            destination_type = optional(string),
          })))
        })))

        default_dhcp_options = optional(object({
          compartment_id   = optional(string),
          compartment_key  = optional(string),
          display_name     = optional(string),
          defined_tags     = optional(map(string)),
          freeform_tags    = optional(map(string)),
          domain_name_type = optional(string),
          options = map(object({
            type                = string,
            server_type         = optional(string),
            custom_dns_servers  = optional(list(string))
            search_domain_names = optional(list(string))
          }))
        }))

        dhcp_options = optional(map(object({
          compartment_id   = optional(string),
          compartment_key  = optional(string),
          display_name     = optional(string),
          defined_tags     = optional(map(string)),
          freeform_tags    = optional(map(string)),
          domain_name_type = optional(string),
          options = map(object({
            type                = string,
            server_type         = optional(string),
            custom_dns_servers  = optional(list(string))
            search_domain_names = optional(list(string))
          }))
        })))

        subnets = optional(map(object({
          cidr_block      = string,
          compartment_id  = optional(string),
          compartment_key = optional(string),
          #Optional
          availability_domain        = optional(string),
          defined_tags               = optional(map(string)),
          dhcp_options_key           = optional(string),
          display_name               = optional(string),
          dns_label                  = optional(string),
          freeform_tags              = optional(map(string)),
          ipv6cidr_block             = optional(string),
          ipv6cidr_blocks            = optional(list(string)),
          prohibit_internet_ingress  = optional(bool),
          prohibit_public_ip_on_vnic = optional(bool),
          route_table_key            = optional(string),
          security_list_keys         = optional(list(string))
        })))

        network_security_groups = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          display_name    = optional(string),
          defined_tags    = optional(map(string))
          freeform_tags   = optional(map(string))
          ingress_rules = optional(map(object({
            description  = optional(string),
            protocol     = string,
            stateless    = optional(bool),
            src          = optional(string),
            src_type     = optional(string),
            dst_port_min = number,
            dst_port_max = number,
            src_port_min = optional(number),
            src_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          }))),
          egress_rules = optional(map(object({
            description  = optional(string),
            protocol     = string,
            stateless    = optional(bool),
            dst          = optional(string),
            dst_type     = optional(string),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            src_port_min = optional(number),
            src_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          })))
        })))

        vcn_specific_gateways = optional(object({
          internet_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            enabled         = optional(bool),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            route_table_key = optional(string)
          })))

          nat_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            block_traffic   = optional(bool),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            public_ip_id    = optional(string),
            route_table_key = optional(string)
          })))

          service_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            // SGW services value:
            //       - objectstorage - for object storage access
            //       - all-services - for all OCI internal network services access
            services        = string,
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            route_table_key = optional(string)
          })))

          local_peering_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            peer_id         = optional(string),
            peer_key        = optional(string),
            route_table_key = optional(string)
          })))
        }))
      })))

      inject_into_existing_vcns = optional(map(object({

        vcn_id = string,

        default_security_list = optional(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          ingress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            src          = string,
            src_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          }))),
          egress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            dst          = string,
            dst_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          })))
        }))

        security_lists = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          display_name    = optional(string),
          ingress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            src          = string,
            src_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          }))),
          egress_rules = optional(list(object({
            stateless    = optional(bool),
            protocol     = string,
            description  = optional(string),
            dst          = string,
            dst_type     = string,
            src_port_min = optional(number),
            src_port_max = optional(number),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          })))
        })))

        default_route_table = optional(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          display_name    = optional(string),
          route_rules = optional(map(object({
            network_entity_id  = optional(string),
            network_entity_key = optional(string),
            description        = optional(string),
            // Supported values:
            //    - "a cidr block"
            //    - "objectstorage" or "all-services" - only for "SERVICE_CIDR_BLOCK"
            destination = optional(string),
            // Supported values:
            //    - "CIDR_BLOCK"
            //    - "SERVICE_CIDR_BLOCK" - only for SGW
            destination_type = optional(string),
          })))
        }))

        route_tables = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          freeform_tags   = optional(map(string)),
          display_name    = optional(string),
          route_rules = optional(map(object({
            network_entity_id  = optional(string),
            network_entity_key = optional(string),
            description        = optional(string),
            description        = optional(string),
            // Supported values:
            //    - "a cidr block"
            //    - "objectstorage" or "all-services" - only for "SERVICE_CIDR_BLOCK"
            destination = optional(string),
            // Supported values:
            //    - "CIDR_BLOCK"
            //    - "SERVICE_CIDR_BLOCK" - only for SGW
            destination_type = optional(string)
          })))
        })))

        default_dhcp_options = optional(object({
          compartment_id   = optional(string),
          compartment_key  = optional(string),
          display_name     = optional(string),
          defined_tags     = optional(map(string)),
          freeform_tags    = optional(map(string)),
          domain_name_type = optional(string),
          options = map(object({
            type                = string,
            server_type         = optional(string),
            custom_dns_servers  = optional(list(string))
            search_domain_names = optional(list(string))
          }))
        }))

        dhcp_options = optional(map(object({
          compartment_id   = optional(string),
          compartment_key  = optional(string),
          display_name     = optional(string),
          defined_tags     = optional(map(string)),
          freeform_tags    = optional(map(string)),
          domain_name_type = optional(string),
          options = map(object({
            type                = string,
            server_type         = optional(string),
            custom_dns_servers  = optional(list(string))
            search_domain_names = optional(list(string))
          }))
        })))

        subnets = optional(map(object({
          cidr_block      = string,
          compartment_id  = optional(string),
          compartment_key = optional(string),
          #Optional
          availability_domain        = optional(string),
          defined_tags               = optional(map(string)),
          dhcp_options_id            = optional(string),
          dhcp_options_key           = optional(string),
          display_name               = optional(string),
          dns_label                  = optional(string),
          freeform_tags              = optional(map(string)),
          ipv6cidr_block             = optional(string),
          ipv6cidr_blocks            = optional(list(string)),
          prohibit_internet_ingress  = optional(bool),
          prohibit_public_ip_on_vnic = optional(bool),
          route_table_id             = optional(string),
          route_table_key            = optional(string),
          security_list_ids          = optional(list(string)),
          security_list_keys         = optional(list(string))
        })))

        network_security_groups = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          display_name    = optional(string),
          defined_tags    = optional(map(string))
          freeform_tags   = optional(map(string))
          ingress_rules = optional(map(object({
            description  = optional(string),
            protocol     = string,
            stateless    = optional(bool),
            src          = optional(string),
            src_type     = optional(string),
            dst_port_min = number,
            dst_port_max = number,
            src_port_min = optional(number),
            src_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          }))),
          egress_rules = optional(map(object({
            description  = optional(string),
            protocol     = string,
            stateless    = optional(bool),
            dst          = optional(string),
            dst_type     = optional(string),
            dst_port_min = optional(number),
            dst_port_max = optional(number),
            src_port_min = optional(number),
            src_port_max = optional(number),
            icmp_type    = optional(number),
            icmp_code    = optional(number)
          })))
        })))

        vcn_specific_gateways = optional(object({
          internet_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            enabled         = optional(bool),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            route_table_id  = optional(string),
            route_table_key = optional(string)
          })))

          nat_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            block_traffic   = optional(bool),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            public_ip_id    = optional(string),
            route_table_id  = optional(string),
            route_table_key = optional(string)
          })))

          service_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            // SGW services value:
            //       - objectstorage - for object storage access
            //       - all-services - for all OCI internal network services access
            services        = string,
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            route_table_id  = optional(string),
            route_table_key = optional(string)
          })))

          local_peering_gateways = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            peer_id         = optional(string),
            peer_key        = optional(string),
            route_table_id  = optional(string),
            route_table_key = optional(string)
          })))
        }))
      })))

      IPs = optional(object({

        public_ips_pools = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          display_name    = optional(string),
          freeform_tags   = optional(map(string)),
        })))

        public_ips = optional(map(object({
          compartment_id     = optional(string),
          compartment_key    = optional(string),
          lifetime           = string,
          defined_tags       = optional(map(string)),
          display_name       = optional(string),
          freeform_tags      = optional(map(string)),
          private_ip_id      = optional(string),
          public_ip_pool_id  = optional(string),
          public_ip_pool_key = optional(string)
        })))
      }))



      non_vcn_specific_gateways = optional(object({

        dynamic_routing_gateways = optional(map(object({
          compartment_id  = optional(string),
          compartment_key = optional(string),
          defined_tags    = optional(map(string)),
          display_name    = optional(string),
          freeform_tags   = optional(map(string)),

          remote_peering_connections = optional(map(object({
            compartment_id   = optional(string),
            compartment_key  = optional(string),
            defined_tags     = optional(map(string)),
            display_name     = optional(string),
            freeform_tags    = optional(map(string)),
            peer_id          = optional(string),
            peer_key         = optional(string),
            peer_region_name = optional(string)
          })))

          drg_attachments = optional(map(object({
            defined_tags        = optional(map(string)),
            display_name        = optional(string),
            freeform_tags       = optional(map(string)),
            drg_route_table_id  = optional(string),
            drg_route_table_key = optional(string),
            network_details = optional(object({
              attached_resource_id  = optional(string),
              attached_resource_key = optional(string),
              type                  = string,
              route_table_id        = optional(string),
              route_table_key       = optional(string),
              vcn_route_type        = optional(string)
            }))
          })))

          drg_route_tables = optional(map(object({
            defined_tags                      = optional(map(string)),
            display_name                      = optional(string),
            freeform_tags                     = optional(map(string)),
            import_drg_route_distribution_id  = optional(string),
            import_drg_route_distribution_key = optional(string),
            is_ecmp_enabled                   = optional(bool),
            route_rules = optional(map(object({
              destination                 = string,
              destination_type            = string,
              next_hop_drg_attachment_id  = optional(string),
              next_hop_drg_attachment_key = optional(string),
            })))
          })))

          drg_route_distributions = optional(map(object({
            distribution_type = string,
            defined_tags      = optional(map(string)),
            display_name      = optional(string),
            freeform_tags     = optional(map(string))
            statements = optional(map(object({
              action = string,
              match_criteria = optional(object({
                match_type         = string,
                attachment_type    = optional(string),
                drg_attachment_id  = optional(string),
                drg_attachment_key = optional(string)
              }))
              priority = optional(number)
            })))
          })))
        })))

        customer_premises_equipments = optional(map(object({
          compartment_id               = optional(string),
          ip_address                   = string,
          defined_tags                 = optional(map(string)),
          display_name                 = optional(string),
          freeform_tags                = optional(map(string)),
          cpe_device_shape_id          = optional(string),
          cpe_device_shape_vendor_name = optional(string)
        })))

        ipsecs = optional(map(object({
          compartment_id            = optional(string),
          cpe_id                    = optional(string),
          cpe_key                   = optional(string),
          drg_id                    = optional(string),
          drg_key                   = optional(string),
          static_routes             = list(string),
          cpe_local_identifier      = optional(string),
          cpe_local_identifier_type = optional(string),
          defined_tags              = optional(map(string)),
          display_name              = optional(string),
          freeform_tags             = optional(map(string)),
          tunnels_management = optional(object({
            tunnel_1 = optional(object({
              routing = string,
              bgp_session_info = optional(object({
                customer_bgp_asn      = optional(string),
                customer_interface_ip = optional(string),
                oracle_interface_ip   = optional(string)
              }))
              encryption_domain_config = optional(object({
                cpe_traffic_selector    = optional(string),
                oracle_traffic_selector = optional(string)
              }))
              shared_secret = optional(string),
              ike_version   = optional(string)
            })),
            tunnel_2 = optional(object({
              routing = string,
              bgp_session_info = optional(object({
                customer_bgp_asn      = optional(string),
                customer_interface_ip = optional(string),
                oracle_interface_ip   = optional(string)
              }))
              encryption_domain_config = optional(object({
                cpe_traffic_selector    = optional(string),
                oracle_traffic_selector = optional(string)
              }))
              shared_secret = optional(string),
              ike_version   = optional(string)
            }))
          }))
        })))

        fast_connect_virtual_circuits = optional(map(object({
          #Required
          compartment_id                              = optional(string),
          compartment_key                             = optional(string),
          provision_fc_virtual_circuit                = bool,
          show_available_fc_virtual_circuit_providers = bool,
          type                                        = string,
          #Optional
          bandwidth_shape_name = optional(string),
          bgp_admin_state      = optional(string),
          cross_connect_mappings = optional(map(object({
            #Optional
            bgp_md5auth_key                          = optional(string)
            cross_connect_or_cross_connect_group_id  = optional(string)
            cross_connect_or_cross_connect_group_key = optional(string)
            customer_bgp_peering_ip                  = optional(string)
            customer_bgp_peering_ipv6                = optional(string)
            oracle_bgp_peering_ip                    = optional(string)
            oracle_bgp_peering_ipv6                  = optional(string)
            vlan                                     = optional(string)
          })))
          customer_asn              = optional(string)
          defined_tags              = optional(map(string))
          display_name              = optional(string)
          freeform_tags             = optional(map(string))
          ip_mtu                    = optional(number)
          is_bfd_enabled            = optional(bool)
          gateway_id                = optional(string)
          gateway_key               = optional(string)
          provider_service_id       = optional(string)
          provider_service_key      = optional(string)
          provider_service_key_name = optional(string)
          public_prefixes = optional(map(object({
            #Required
            cidr_block = string,
          })))
          region         = optional(string)
          routing_policy = optional(list(string))
        })))

        cross_connect_groups = optional(map(object({
          compartment_id          = optional(string),
          customer_reference_name = optional(string),
          defined_tags            = optional(map(string)),
          display_name            = optional(string),
          freeform_tags           = optional(map(string)),
          cross_connects = optional(map(object({
            compartment_id                                = optional(string),
            location_name                                 = string,
            port_speed_shape_name                         = string,
            customer_reference_name                       = optional(string),
            defined_tags                                  = optional(map(string))
            display_name                                  = optional(string),
            far_cross_connect_or_cross_connect_group_id   = optional(string),
            far_cross_connect_or_cross_connect_group_key  = optional(string),
            freeform_tags                                 = optional(map(string))
            near_cross_connect_or_cross_connect_group_id  = optional(string),
            near_cross_connect_or_cross_connect_group_key = optional(string),
          })))
        })))

        inject_into_existing_drgs = optional(map(object({
          drg_id = string,

          remote_peering_connections = optional(map(object({
            compartment_id   = optional(string),
            compartment_key  = optional(string),
            defined_tags     = optional(map(string)),
            display_name     = optional(string),
            freeform_tags    = optional(map(string)),
            peer_id          = optional(string),
            peer_key         = optional(string),
            peer_region_name = optional(string)
          })))

          drg_attachments = optional(map(object({
            defined_tags        = optional(map(string)),
            display_name        = optional(string),
            freeform_tags       = optional(map(string)),
            drg_route_table_id  = optional(string),
            drg_route_table_key = optional(string),
            network_details = optional(object({
              attached_resource_id  = optional(string),
              attached_resource_key = optional(string),
              type                  = string,
              route_table_id        = optional(string),
              route_table_key       = optional(string),
              vcn_route_type        = optional(string)
            }))
          })))

          drg_route_tables = optional(map(object({
            defined_tags                      = optional(map(string)),
            display_name                      = optional(string),
            freeform_tags                     = optional(map(string)),
            import_drg_route_distribution_id  = optional(string),
            import_drg_route_distribution_key = optional(string),
            is_ecmp_enabled                   = optional(bool),
            route_rules = optional(map(object({
              destination                 = string,
              destination_type            = string,
              next_hop_drg_attachment_id  = optional(string),
              next_hop_drg_attachment_key = optional(string),
            })))
          })))

          drg_route_distributions = optional(map(object({
            distribution_type = string,
            defined_tags      = optional(map(string)),
            display_name      = optional(string),
            freeform_tags     = optional(map(string))
            statements = optional(map(object({
              action = string,
              match_criteria = optional(object({
                match_type         = string,
                attachment_type    = optional(string),
                drg_attachment_id  = optional(string),
                drg_attachment_key = optional(string)
              }))
              priority = number
            })))
          })))
        })))

        network_firewalls_configuration = optional(object({
          network_firewalls = optional(map(object({
            availability_domain         = optional(number),
            compartment_id              = optional(string),
            defined_tags                = optional(map(string)),
            display_name                = optional(string),
            freeform_tags               = optional(map(string)),
            ipv4address                 = optional(string),
            ipv6address                 = optional(string),
            network_security_group_ids  = optional(list(string)),
            network_security_group_keys = optional(list(string)),
            subnet_id                   = optional(string),
            subnet_key                  = optional(string),
            network_firewall_policy_id  = optional(string),
            network_firewall_policy_key = optional(string)
          }))),

          network_firewall_policies = optional(map(object({
            compartment_id  = optional(string),
            compartment_key = optional(string),
            defined_tags    = optional(map(string)),
            display_name    = optional(string),
            freeform_tags   = optional(map(string)),
            application_lists = optional(map(object({
              application_list_name = string,
              application_values = map(object({
                type         = string,
                icmp_type    = optional(string),
                icmp_code    = optional(string),
                minimum_port = optional(number),
                maximum_port = optional(number)
              }))
            })))
            decryption_profiles = optional(map(object({
              is_out_of_capacity_blocked            = bool,
              is_unsupported_cipher_blocked         = bool,
              is_unsupported_version_blocked        = bool,
              type                                  = string,
              key                                   = string,
              are_certificate_extensions_restricted = optional(bool),
              is_auto_include_alt_name              = optional(bool),
              is_expired_certificate_blocked        = optional(bool),
              is_revocation_status_timeout_blocked  = optional(bool),
              is_unknown_revocation_status_blocked  = optional(bool),
              is_untrusted_issuer_blocked           = optional(bool)
            })))
            decryption_rules = optional(map(object({
              action             = string,
              name               = string,
              decryption_profile = optional(string),
              secret             = optional(string),
              conditions = map(object({
                destinations = optional(list(string)),
                sources      = optional(list(string))
              }))
            })))
            ip_address_lists = optional(map(object({
              ip_address_list_name  = string,
              ip_address_list_value = list(string)
            })))
            mapped_secrets = optional(map(object({
              key             = optional(string),
              type            = string,
              vault_secret_id = string,
              version_number  = string,
            })))
            security_rules = optional(map(object({
              action     = string,
              inspection = optional(string),
              name       = string
              conditions = map(object({
                applications = optional(list(string)),
                destinations = optional(list(string)),
                sources      = optional(list(string)),
                urls         = optional(list(string))
              }))
            })))
            url_lists = optional(map(object({
              url_list_name = string,
              url_list_values = map(object({
                type    = string,
                pattern = string
              }))
            })))
          })))
        }))

        l7_load_balancers = optional(map(object({
          compartment_id              = optional(string),
          compartment_key             = optional(string),
          display_name                = string,
          shape                       = string,
          subnet_ids                  = list(string),
          subnet_keys                 = list(string),
          defined_tags                = optional(map(string)),
          freeform_tags               = optional(map(string)),
          ip_mode                     = optional(string),
          is_private                  = optional(bool),
          network_security_group_ids  = optional(list(string)),
          network_security_group_keys = optional(list(string)),
          reserved_ips_ids            = optional(list(string)),
          reserved_ips_keys           = optional(list(string))
          shape_details = optional(object({
            maximum_bandwidth_in_mbps = number,
            minimum_bandwidth_in_mbps = number
          }))
          backend_sets = optional(map(object({
            health_checker = object({
              protocol            = string,
              interval_ms         = number,
              is_force_plain_text = bool,
              port                = number,
              response_body_regex = optional(string),
              retries             = number,
              return_code         = number,
              timeout_in_millis   = number,
              url_path            = optional(string)
            })
            name   = string,
            policy = string,
            lb_cookie_session_persistence_configuration = optional(object({
              cookie_name        = optional(string),
              disable_fallback   = optional(bool),
              domain             = optional(string),
              is_http_only       = optional(bool),
              is_secure          = optional(bool),
              max_age_in_seconds = optional(number),
              path               = optional(string),
            }))
            session_persistence_configuration = optional(object({
              cookie_name      = string,
              disable_fallback = optional(bool)
            }))
            ssl_configuration = optional(object({
              certificate_ids                    = optional(list(string)),
              certificate_keys                   = optional(list(string)),
              certificate_name                   = optional(string),
              cipher_suite_name                  = optional(string),
              protocols                          = optional(list(string)),
              server_order_preference            = optional(string),
              trusted_certificate_authority_ids  = optional(list(string)),
              trusted_certificate_authority_keys = optional(list(string)),
              verify_depth                       = optional(number),
              verify_peer_certificate            = optional(bool),
            }))
            backends = optional(map(object({
              ip_address = string,
              port       = number,
              backup     = optional(bool),
              drain      = optional(bool),
              offline    = optional(bool),
              weight     = optional(number)
            })))
          })))
          cipher_suites = optional(map(object({
            ciphers = list(string),
            name    = string
          })))
          path_route_sets = optional(map(object({
            name = string,
            path_routes = map(object({
              backend_set_key = string,
              path            = string,
              path_match_type = object({
                match_type = string
              })
            }))
          })))
          host_names = optional(map(object({
            hostname = string,
            name     = string
          })))
          routing_policies = optional(map(object({
            condition_language_version = string,
            name                       = string,
            rules = map(object({
              actions = map(object({
                backend_set_key = string,
                name            = string,
              }))
              condition = string,
              name      = string
            }))
          })))
          rule_sets = optional(map(object({
            name = string,
            items = map(object({
              action                         = string,
              allowed_methods                = optional(list(string)),
              are_invalid_characters_allowed = optional(bool),
              conditions = optional(map(object({
                attribute_name  = string,
                attribute_value = string,
                operator        = optional(string)
              })))
              description                  = optional(string),
              header                       = optional(string),
              http_large_header_size_in_kb = optional(number),
              prefix                       = optional(string),
              redirect_uri = optional(object({
                host     = optional(string, )
                path     = optional(string),
                port     = optional(number),
                protocol = optional(string),
                query    = optional(string)
              }))
              response_code = optional(number)
              status_code   = optional(number),
              suffix        = optional(string),
              value         = optional(string)
            }))
          })))
          certificates = optional(map(object({
            #Required
            certificate_name = string,
            #Optional
            ca_certificate     = optional(string),
            passphrase         = optional(string),
            private_key        = optional(string),
            public_certificate = optional(string)
          })))
          listeners = optional(map(object({
            default_backend_set_key = string,
            name                    = string,
            port                    = string,
            protocol                = string,
            connection_configuration = optional(object({
              idle_timeout_in_seconds            = number,
              backend_tcp_proxy_protocol_version = optional(string)
            }))
            hostname_keys      = optional(list(string)),
            path_route_set_key = optional(string),
            routing_policy_key = optional(string),
            rule_set_keys      = optional(list(string)),
            ssl_configuration = optional(object({
              certificate_key                   = optional(string),
              certificate_ids                   = optional(list(string)),
              cipher_suite_key                  = optional(string),
              protocols                         = optional(list(string)),
              server_order_preference           = optional(string),
              trusted_certificate_authority_ids = optional(list(string)),
              verify_depth                      = optional(number),
              verify_peer_certificate           = optional(bool)
            }))
          })))
        })))
      }))
      }
    )))
  })
}
