# ####################################################################################################### #
# Copyright (c) 2023 Oracle and/or its affiliates,  All rights reserved.                                  #
# Licensed under the Universal Permissive License v 1.0 as shown at https: //oss.oracle.com/licenses/upl. #
# Author: Cosmin Tudor                                                                                    #
# Author email: cosmin.tudor@oracle.com                                                                   #
# Last Modified: Tue Nov 21 2023                                                                          #
# Modified by: Cosmin Tudor, email: cosmin.tudor@oracle.com                                               #
# ####################################################################################################### #

locals {
  network_configuration = var.network_configuration != null ? length(var.network_configuration) > 0 ? {
    default_compartment_id     = var.network_configuration.default_compartment_id != null ? var.network_configuration.default_compartment_id : var.network_configuration.default_compartment_key != null ? local.compartments[var.network_configuration.default_compartment_key].id : null
    default_defined_tags       = var.network_configuration.default_defined_tags
    default_freeform_tags      = var.network_configuration.default_freeform_tags
    default_enable_cis_checks  = var.network_configuration.default_enable_cis_checks
    default_ssh_ports_to_check = var.network_configuration.default_ssh_ports_to_check

    network_configuration_categories = var.network_configuration.network_configuration_categories != null ? length(var.network_configuration.network_configuration_categories) > 0 ? {
      for netconfig_key, netconfig_value in var.network_configuration.network_configuration_categories : netconfig_key => {
        category_compartment_id     = netconfig_value.category_compartment_id != null ? netconfig_value.category_compartment_id : netconfig_value.category_compartment_key != null ? local.compartments[netconfig_value.category_compartment_key].id : null
        category_defined_tags       = netconfig_value.category_defined_tags
        category_freeform_tags      = netconfig_value.category_freeform_tags
        category_enable_cis_checks  = netconfig_value.category_enable_cis_checks
        category_ssh_ports_to_check = netconfig_value.category_ssh_ports_to_check
        vcns = netconfig_value.vcns != null ? length(netconfig_value.vcns) > 0 ? {
          for vcn_key, vcn_value in netconfig_value.vcns : vcn_key => {
            compartment_id                   = vcn_value.compartment_id != null ? vcn_value.compartment_id : vcn_value.compartment_key != null ? local.compartments[vcn_value.compartment_key].id : null
            display_name                     = vcn_value.display_name
            byoipv6cidr_details              = vcn_value.byoipv6cidr_details
            ipv6private_cidr_blocks          = vcn_value.ipv6private_cidr_blocks
            is_ipv6enabled                   = vcn_value.is_ipv6enabled
            is_oracle_gua_allocation_enabled = vcn_value.is_oracle_gua_allocation_enabled
            cidr_blocks                      = vcn_value.cidr_blocks
            dns_label                        = vcn_value.dns_label
            block_nat_traffic                = vcn_value.block_nat_traffic
            defined_tags                     = vcn_value.defined_tags
            freeform_tags                    = vcn_value.freeform_tags
            default_security_list = vcn_value.default_security_list != null ? {
              compartment_id = vcn_value.default_security_list.compartment_id != null ? vcn_value.default_security_list.compartment_id : vcn_value.default_security_list.compartment_key != null ? local.compartments[vcn_value.default_security_list.compartment_key].id : null
              defined_tags   = vcn_value.default_security_list.defined_tags
              freeform_tags  = vcn_value.default_security_list.freeform_tags
              display_name   = vcn_value.default_security_list.display_name
              ingress_rules  = vcn_value.default_security_list.ingress_rules
              egress_rules   = vcn_value.default_security_list.egress_rules
            } : null
            security_lists = vcn_value.security_lists != null ? length(vcn_value.security_lists) > 0 ? {
              for seclist_key, seclist_value in vcn_value.security_lists : seclist_key => {
                compartment_id = seclist_value.compartment_id != null ? seclist_value.compartment_id : seclist_value.compartment_key != null ? local.compartments[seclist_value.compartment_key].id : null
                defined_tags   = seclist_value.defined_tags
                freeform_tags  = seclist_value.freeform_tags
                display_name   = seclist_value.display_name
                ingress_rules  = seclist_value.ingress_rules
                egress_rules   = seclist_value.egress_rules
              }
            } : {} : {}
            default_route_table = vcn_value.default_route_table != null ? {
              compartment_id = vcn_value.default_route_table.compartment_id != null ? vcn_value.default_route_table.compartment_id : vcn_value.default_route_table.compartment_key != null ? local.compartments[vcn_value.default_route_table.compartment_key].id : null
              defined_tags   = vcn_value.default_route_table.defined_tags
              freeform_tags  = vcn_value.default_route_table.freeform_tags
              display_name   = vcn_value.default_route_table.display_name
              route_rules    = vcn_value.default_route_table.route_rules
            } : null
            route_tables = vcn_value.route_tables != null ? length(vcn_value.route_tables) > 0 ? {
              for rt_key, rt_value in vcn_value.route_tables : rt_key => {
                compartment_id = rt_value.compartment_id != null ? rt_value.compartment_id : rt_value.compartment_key != null ? local.compartments[rt_value.compartment_key].id : null
                defined_tags   = rt_value.defined_tags
                freeform_tags  = rt_value.freeform_tags
                display_name   = rt_value.display_name
                route_rules    = rt_value.route_rules
              }
            } : {} : {}
            default_dhcp_options = vcn_value.default_dhcp_options != null ? {
              compartment_id   = vcn_value.default_dhcp_options.compartment_id != null ? vcn_value.default_dhcp_options.compartment_id : vcn_value.default_dhcp_options.compartment_key != null ? local.compartments[vcn_value.default_dhcp_options.compartment_key].id : null
              defined_tags     = vcn_value.default_dhcp_options.defined_tags
              freeform_tags    = vcn_value.default_dhcp_options.freeform_tags
              display_name     = vcn_value.default_dhcp_options.display_name
              domain_name_type = vcn_value.default_dhcp_options.domain_name_type
              options          = vcn_value.default_dhcp_options.options
            } : null
            dhcp_options = vcn_value.dhcp_options != null ? length(vcn_value.dhcp_options) > 0 ? {
              for dhcpo_key, dhcpo_value in vcn_value.dhcp_options : dhcpo_key => {
                compartment_id   = dhcpo_value.compartment_id != null ? dhcpo_value.compartment_id : dhcpo_value.compartment_key != null ? local.compartments[dhcpo_value.compartment_key].id : null
                defined_tags     = dhcpo_value.defined_tags
                freeform_tags    = dhcpo_value.freeform_tags
                display_name     = dhcpo_value.display_name
                domain_name_type = dhcpo_value.domain_name_type
                options          = dhcpo_value.options
              }
            } : {} : {}
            subnets = vcn_value.subnets != null ? length(vcn_value.subnets) > 0 ? {
              for subn_key, subn_value in vcn_value.subnets : subn_key => {
                compartment_id             = subn_value.compartment_id != null ? subn_value.compartment_id : subn_value.compartment_key != null ? local.compartments[subn_value.compartment_key].id : null
                cidr_block                 = subn_value.cidr_block
                availability_domain        = subn_value.availability_domain
                defined_tags               = subn_value.defined_tags
                dhcp_options_key           = subn_value.dhcp_options_key
                freeform_tags              = subn_value.freeform_tags
                display_name               = subn_value.display_name
                dns_label                  = subn_value.dns_label
                freeform_tags              = subn_value.freeform_tags
                ipv6cidr_block             = subn_value.ipv6cidr_block
                ipv6cidr_blocks            = subn_value.ipv6cidr_blocks
                prohibit_internet_ingress  = subn_value.prohibit_internet_ingress
                prohibit_public_ip_on_vnic = subn_value.prohibit_public_ip_on_vnic
                route_table_key            = subn_value.route_table_key
                security_list_keys         = subn_value.security_list_keys
              }
            } : {} : {}
            network_security_groups = vcn_value.network_security_groups != null ? length(vcn_value.network_security_groups) > 0 ? {
              for nsg_key, nsg_value in vcn_value.network_security_groups : nsg_key => {
                compartment_id = nsg_value.compartment_id != null ? nsg_value.compartment_id : nsg_value.compartment_key != null ? local.compartments[nsg_value.compartment_key].id : null
                defined_tags   = nsg_value.defined_tags
                freeform_tags  = nsg_value.freeform_tags
                ingress_rules  = nsg_value.ingress_rules
                egress_rules   = nsg_value.egress_rules
                display_name   = nsg_value.display_name
              }
            } : {} : {}
            vcn_specific_gateways = vcn_value.vcn_specific_gateways != null ? {
              internet_gateways = vcn_value.vcn_specific_gateways.internet_gateways != null ? length(vcn_value.vcn_specific_gateways.internet_gateways) > 0 ? {
                for ig_key, ig_value in vcn_value.vcn_specific_gateways.internet_gateways : ig_key => {
                  compartment_id  = ig_value.compartment_id != null ? ig_value.compartment_id : ig_value.compartment_key != null ? local.compartments[ig_value.compartment_key].id : null
                  enabled         = ig_value.enabled
                  defined_tags    = ig_value.defined_tags
                  display_name    = ig_value.display_name
                  freeform_tags   = ig_value.freeform_tags
                  route_table_key = ig_value.route_table_key
                }
              } : {} : {}
              nat_gateways = vcn_value.vcn_specific_gateways.nat_gateways != null ? length(vcn_value.vcn_specific_gateways.nat_gateways) > 0 ? {
                for natg_key, natg_value in vcn_value.vcn_specific_gateways.nat_gateways : natg_key => {
                  compartment_id  = natg_value.compartment_id != null ? natg_value.compartment_id : natg_value.compartment_key != null ? local.compartments[natg_value.compartment_key].id : null
                  block_traffic   = natg_value.block_traffic
                  defined_tags    = natg_value.defined_tags
                  display_name    = natg_value.display_name
                  freeform_tags   = natg_value.freeform_tags
                  public_ip_id    = natg_value.public_ip_id
                  route_table_key = natg_value.route_table_key
                }
              } : {} : {}
              service_gateways = vcn_value.vcn_specific_gateways.service_gateways != null ? length(vcn_value.vcn_specific_gateways.service_gateways) > 0 ? {
                for svcg_key, svcg_value in vcn_value.vcn_specific_gateways.service_gateways : svcg_key => {
                  compartment_id  = svcg_value.compartment_id != null ? svcg_value.compartment_id : svcg_value.compartment_key != null ? local.compartments[svcg_value.compartment_key].id : null
                  defined_tags    = svcg_value.defined_tags
                  display_name    = svcg_value.display_name
                  freeform_tags   = svcg_value.freeform_tags
                  route_table_key = svcg_value.route_table_key
                  services        = svcg_value.services
                }
              } : {} : {}
              local_peering_gateways = vcn_value.vcn_specific_gateways.local_peering_gateways != null ? length(vcn_value.vcn_specific_gateways.local_peering_gateways) > 0 ? {
                for lpg_key, lpg_value in vcn_value.vcn_specific_gateways.local_peering_gateways : lpg_key => {
                  compartment_id  = lpg_value.compartment_id != null ? lpg_value.compartment_id : lpg_value.compartment_key != null ? local.compartments[lpg_value.compartment_key].id : null
                  defined_tags    = lpg_value.defined_tags
                  display_name    = lpg_value.display_name
                  freeform_tags   = lpg_value.freeform_tags
                  peer_id         = lpg_value.peer_id
                  peer_key        = lpg_value.peer_key
                  route_table_key = lpg_value.route_table_key
                }
              } : {} : {}
            } : null
          }
        } : {} : {}
        inject_into_existing_vcns = netconfig_value.inject_into_existing_vcns != null ? length(netconfig_value.inject_into_existing_vcns) > 0 ? {
          for vcn_key, vcn_value in netconfig_value.inject_into_existing_vcns : vcn_key => {
            vcn_id = vcn_value.vcn_id
            default_security_list = vcn_value.default_security_list != null ? {
              compartment_id = vcn_value.default_security_list.compartment_id != null ? vcn_value.default_security_list.compartment_id : vcn_value.default_security_list.compartment_key != null ? local.compartments[vcn_value.default_security_list.compartment_key].id : null
              defined_tags   = vcn_value.default_security_list.defined_tags
              freeform_tags  = vcn_value.default_security_list.freeform_tags
              display_name   = vcn_value.default_security_list.display_name
              ingress_rules  = vcn_value.default_security_list.ingress_rules
              egress_rules   = vcn_value.default_security_list.egress_rules
            } : null
            security_lists = vcn_value.security_lists != null ? length(vcn_value.security_lists) > 0 ? {
              for seclist_key, seclist_value in vcn_value.security_lists : seclist_key => {
                compartment_id = seclist_value.compartment_id != null ? seclist_value.compartment_id : seclist_value.compartment_key != null ? local.compartments[seclist_value.compartment_key].id : null
                defined_tags   = seclist_value.defined_tags
                freeform_tags  = seclist_value.freeform_tags
                display_name   = seclist_value.display_name
                ingress_rules  = seclist_value.ingress_rules
                egress_rules   = seclist_value.egress_rules
              }
            } : {} : {}
            default_route_table = vcn_value.default_route_table != null ? {
              compartment_id = vcn_value.default_route_table.compartment_id != null ? vcn_value.default_route_table.compartment_id : vcn_value.default_route_table.compartment_key != null ? local.compartments[vcn_value.default_route_table.compartment_key].id : null
              defined_tags   = vcn_value.default_route_table.defined_tags
              freeform_tags  = vcn_value.default_route_table.freeform_tags
              display_name   = vcn_value.default_route_table.display_name
              route_rules    = vcn_value.default_route_table.route_rules
            } : null
            route_tables = vcn_value.route_tables != null ? length(vcn_value.route_tables) > 0 ? {
              for rt_key, rt_value in vcn_value.route_tables : rt_key => {
                compartment_id = rt_value.compartment_id != null ? rt_value.compartment_id : rt_value.compartment_key != null ? local.compartments[rt_value.compartment_key].id : null
                defined_tags   = rt_value.defined_tags
                freeform_tags  = rt_value.freeform_tags
                display_name   = rt_value.display_name
                route_rules    = rt_value.route_rules
              }
            } : {} : {}
            default_dhcp_options = vcn_value.default_dhcp_options != null ? {
              compartment_id   = vcn_value.default_dhcp_options.compartment_id != null ? vcn_value.default_dhcp_options.compartment_id : vcn_value.default_dhcp_options.compartment_key != null ? local.compartments[vcn_value.default_dhcp_options.compartment_key].id : null
              defined_tags     = vcn_value.default_dhcp_options.defined_tags
              freeform_tags    = vcn_value.default_dhcp_options.freeform_tags
              display_name     = vcn_value.default_dhcp_options.display_name
              domain_name_type = vcn_value.default_dhcp_options.domain_name_type
              options          = vcn_value.default_dhcp_options.options
            } : null
            dhcp_options = vcn_value.dhcp_options != null ? length(vcn_value.dhcp_options) > 0 ? {
              for dhcpo_key, dhcpo_value in vcn_value.dhcp_options : dhcpo_key => {
                compartment_id   = dhcpo_value.compartment_id != null ? dhcpo_value.compartment_id : dhcpo_value.compartment_key != null ? local.compartments[dhcpo_value.compartment_key].id : null
                defined_tags     = dhcpo_value.defined_tags
                freeform_tags    = dhcpo_value.freeform_tags
                display_name     = dhcpo_value.display_name
                domain_name_type = dhcpo_value.domain_name_type
                options          = dhcpo_value.options
              }
            } : {} : {}
            subnets = vcn_value.subnets != null ? length(vcn_value.subnets) > 0 ? {
              for subn_key, subn_value in vcn_value.subnets : subn_key => {
                compartment_id             = subn_value.compartment_id != null ? subn_value.compartment_id : subn_value.compartment_key != null ? local.compartments[subn_value.compartment_key].id : null
                cidr_block                 = subn_value.cidr_block
                availability_domain        = subn_value.availability_domain
                defined_tags               = subn_value.defined_tags
                dhcp_options_id            = subn_value.dhcp_options_id
                dhcp_options_key           = subn_value.dhcp_options_key
                freeform_tags              = subn_value.freeform_tags
                display_name               = subn_value.display_name
                dns_label                  = subn_value.dns_label
                freeform_tags              = subn_value.freeform_tags
                ipv6cidr_block             = subn_value.ipv6cidr_block
                ipv6cidr_blocks            = subn_value.ipv6cidr_blocks
                prohibit_internet_ingress  = subn_value.prohibit_internet_ingress
                prohibit_public_ip_on_vnic = subn_value.prohibit_public_ip_on_vnic
                route_table_id             = subn_value.route_table_id
                route_table_key            = subn_value.route_table_key
                security_list_keys         = subn_value.security_list_keys
                security_list_ids          = subn_value.security_list_ids
              }
            } : {} : {}
            network_security_groups = vcn_value.network_security_groups != null ? length(vcn_value.network_security_groups) > 0 ? {
              for nsg_key, nsg_value in vcn_value.network_security_groups : nsg_key => {
                compartment_id = nsg_value.compartment_id != null ? nsg_value.compartment_id : nsg_value.compartment_key != null ? local.compartments[nsg_value.compartment_key].id : null
                defined_tags   = nsg_value.defined_tags
                freeform_tags  = nsg_value.freeform_tags
                ingress_rules  = nsg_value.ingress_rules
                egress_rules   = nsg_value.egress_rules
              }
            } : {} : {}
            vcn_specific_gateways = vcn_value.vcn_specific_gateways != null ? {
              internet_gateways = vcn_value.vcn_specific_gateways.internet_gateways != null ? length(vcn_value.vcn_specific_gateways.internet_gateways) > 0 ? {
                for ig_key, ig_value in vcn_value.vcn_specific_gateways.internet_gateways : ig_key => {
                  compartment_id  = ig_value.compartment_id != null ? ig_value.compartment_id : ig_value.compartment_key != null ? local.compartments[ig_value.compartment_key].id : null
                  enabled         = ig_value.enabled
                  defined_tags    = ig_value.defined_tags
                  display_name    = ig_value.display_name
                  freeform_tags   = ig_value.freeform_tags
                  route_table_id  = ig_value.route_table_id
                  route_table_key = ig_value.route_table_key
                }
              } : {} : {}
              nat_gateways = vcn_value.vcn_specific_gateways.nat_gateways != null ? length(vcn_value.vcn_specific_gateways.nat_gateways) > 0 ? {
                for natg_key, natg_value in vcn_value.vcn_specific_gateways.nat_gateways : natg_key => {
                  compartment_id  = natg_value.compartment_id != null ? natg_value.compartment_id : natg_value.compartment_key != null ? local.compartments[natg_value.compartment_key].id : null
                  block_traffic   = natg_value.block_traffic
                  defined_tags    = natg_value.defined_tags
                  display_name    = natg_value.display_name
                  freeform_tags   = natg_value.freeform_tags
                  public_ip_id    = natg_value.public_ip_id
                  route_table_id  = natg_value.route_table_id
                  route_table_key = natg_value.route_table_key
                }
              } : {} : {}
              service_gateways = vcn_value.vcn_specific_gateways.service_gateways != null ? length(vcn_value.vcn_specific_gateways.service_gateways) > 0 ? {
                for svcg_key, svcg_value in vcn_value.vcn_specific_gateways.service_gateways : svcg_key => {
                  compartment_id   = svcg_value.compartment_id != null ? svcg_value.compartment_id : svcg_value.compartment_key != null ? local.compartments[svcg_value.compartment_key].id : null
                  defined_tags     = svcg_value.defined_tags
                  display_name     = svcg_value.display_name
                  freeform_tags    = svcg_value.freeform_tags
                  route_table_name = svcg_value.route_table_name
                  route_table_key  = svcg_value.route_table_key
                  services         = svcg_value.services
                }
              } : {} : {}
              local_peering_gateways = vcn_value.vcn_specific_gateways.local_peering_gateways != null ? length(vcn_value.vcn_specific_gateways.local_peering_gateways) > 0 ? {
                for lpg_key, lpg_value in vcn_value.vcn_specific_gateways.local_peering_gateways : lpg_key => {
                  compartment_id  = lpg_value.compartment_id != null ? lpg_value.compartment_id : lpg_value.compartment_key != null ? local.compartments[lpg_value.compartment_key].id : null
                  defined_tags    = lpg_value.defined_tags
                  display_name    = lpg_value.display_name
                  freeform_tags   = lpg_value.freeform_tags
                  peer_id         = lpg_value.peer_id
                  peer_key        = lpg_value.peer_key
                  route_table_key = lpg_value.route_table_key
                  route_table_id  = lpg_value.route_table_id
                }
              } : {} : {}
            } : null
          }
        } : {} : {}

        IPs = netconfig_value.IPs != null ? length(netconfig_value.IPs) > 0 ? {

          public_ips_pools = netconfig_value.IPs.public_ips_pools != null ? length(netconfig_value.IPs.public_ips_pools) > 0 ? {
            for pip_key, pip_value in netconfig_value.IPs.public_ips_pools : pip_key => {
              compartment_id = pip_value.compartment_id != null ? pip_value.compartment_id : pip_value.compartment_key != null ? local.compartments[pip_value.compartment_key].id : null
              defined_tags   = pip_value.defined_tags
              display_name   = pip_value.display_name
              freeform_tags  = pip_value.freeform_tags
            }
          } : {} : {}

          public_ips = netconfig_value.IPs.public_ips != null ? length(netconfig_value.IPs.public_ips) > 0 ? {
            for pi_key, pi_value in netconfig_value.IPs.public_ips : pi_key => {
              compartment_id     = pi_value.compartment_id != null ? pi_value.compartment_id : pi_value.compartment_key != null ? local.compartments[pi_value.compartment_key].id : null
              lifetime           = pi_value.lifetime
              defined_tags       = pi_value.defined_tags
              display_name       = pi_value.display_name
              freeform_tags      = pi_value.freeform_tags
              private_ip_id      = pi_value.private_ip_id
              public_ip_pool_id  = pi_value.public_ip_pool_id
              public_ip_pool_key = pi_value.public_ip_pool_key
            }
          } : {} : {}
        } : {} : {}

        non_vcn_specific_gateways = netconfig_value.non_vcn_specific_gateways != null ? {
          dynamic_routing_gateways = netconfig_value.non_vcn_specific_gateways.dynamic_routing_gateways != null ? length(netconfig_value.non_vcn_specific_gateways.dynamic_routing_gateways) > 0 ? {
            for drg_key, drg_value in netconfig_value.non_vcn_specific_gateways.dynamic_routing_gateways : drg_key => {
              compartment_id = drg_value.compartment_id != null ? drg_value.compartment_id : drg_value.compartment_key != null ? local.compartments[drg_value.compartment_key].id : null
              defined_tags   = drg_value.defined_tags
              display_name   = drg_value.display_name
              freeform_tags  = drg_value.freeform_tags
              remote_peering_connections = drg_value.remote_peering_connections != null ? length(drg_value.remote_peering_connections) > 0 ? {
                for rpc_key, rpc_value in drg_value.remote_peering_connections : rpc_key => {
                  compartment_id   = rpc_value.compartment_id != null ? rpc_value.compartment_id : rpc_value.compartment_key != null ? local.compartments[rpc_value.compartment_key].id : null
                  defined_tags     = rpc_value.defined_tags
                  display_name     = rpc_value.display_name
                  freeform_tags    = rpc_value.freeform_tags
                  peer_id          = rpc_value.peer_id
                  peer_key         = rpc_value.peer_key
                  peer_region_name = rpc_value.peer_region_name
                }
              } : {} : {}
              drg_attachments         = drg_value.drg_attachments
              drg_route_tables        = drg_value.drg_route_tables
              drg_route_distributions = drg_value.drg_route_distributions
            }
          } : {} : {}

          customer_premises_equipments = netconfig_value.non_vcn_specific_gateways.customer_premises_equipments != null ? length(netconfig_value.non_vcn_specific_gateways.customer_premises_equipments) > 0 ? { for cpe_key, cpe_value in netconfig_value.non_vcn_specific_gateways.customer_premises_equipments : cpe_key => {
            compartment_id               = cpe_value.compartment_id != null ? cpe_value.compartment_id : cpe_value.compartment_key != null ? local.compartments[cpe_value.compartment_key].id : null
            ip_address                   = cpe_value.ip_address
            defined_tags                 = cpe_value.defined_tags
            display_name                 = cpe_value.display_name
            freeform_tags                = cpe_value.freeform_tags
            cpe_device_shape_id          = cpe_value.cpe_device_shape_id
            cpe_device_shape_vendor_name = cpe_value.cpe_device_shape_vendor_name
            }
          } : {} : {}

          ipsecs = netconfig_value.non_vcn_specific_gateways.ipsecs != null ? length(netconfig_value.non_vcn_specific_gateways.ipsecs) > 0 ? {
            for ipsec_key, ipsec_value in netconfig_value.non_vcn_specific_gateways.ipsecs : ipsec_key => {
              compartment_id            = ipsec_value.compartment_id != null ? ipsec_value.compartment_id : ipsec_value.compartment_key != null ? local.compartments[ipsec_value.compartment_key].id : null
              cpe_id                    = ipsec_value.cpe_id
              cpe_key                   = ipsec_value.cpe_key
              drg_id                    = ipsec_value.drg_id
              drg_key                   = ipsec_value.drg_key
              static_routes             = ipsec_value.static_routes
              cpe_local_identifier      = ipsec_value.cpe_local_identifier
              cpe_local_identifier_type = ipsec_value.cpe_local_identifier_type
              defined_tags              = ipsec_value.defined_tags
              display_name              = ipsec_value.display_name
              freeform_tags             = ipsec_value.freeform_tags
              tunnels_management        = ipsec_value.tunnels_management
            }
          } : {} : {}

          fast_connect_virtual_circuits = netconfig_value.non_vcn_specific_gateways.fast_connect_virtual_circuits != null ? length(netconfig_value.non_vcn_specific_gateways.fast_connect_virtual_circuits) > 0 ? {
            for fcvc_key, fcvc_value in netconfig_value.non_vcn_specific_gateways.fast_connect_virtual_circuits : fcvc_key => {
              compartment_id                              = fcvc_value.compartment_id != null ? fcvc_value.compartment_id : fcvc_value.compartment_key != null ? local.compartments[fcvc_value.compartment_key].id : null
              provision_fc_virtual_circuit                = fcvc_value.provision_fc_virtual_circuit
              show_available_fc_virtual_circuit_providers = fcvc_value.show_available_fc_virtual_circuit_providers
              type                                        = fcvc_value.type
              #Optional
              bandwidth_shape_name      = fcvc_value.bandwidth_shape_name
              bgp_admin_state           = fcvc_value.bgp_admin_state
              cross_connect_mappings    = fcvc_value.cross_connect_mappings
              customer_asn              = fcvc_value.customer_asn
              defined_tags              = fcvc_value.defined_tags
              display_name              = fcvc_value.display_name
              freeform_tags             = fcvc_value.freeform_tags
              ip_mtu                    = fcvc_value.ip_mtu
              is_bfd_enabled            = fcvc_value.is_bfd_enabled
              gateway_id                = fcvc_value.gateway_id
              gateway_key               = fcvc_value.gateway_key
              provider_service_id       = fcvc_value.provider_service_id
              provider_service_key      = fcvc_value.provider_service_key
              provider_service_key_name = fcvc_value.provider_service_key_name
              public_prefixes           = fcvc_value.public_prefixes
              region                    = fcvc_value.region
              routing_policy            = fcvc_value.routing_policy
            }
          } : {} : {}

          cross_connect_groups = netconfig_value.non_vcn_specific_gateways.cross_connect_groups != null ? length(netconfig_value.non_vcn_specific_gateways.cross_connect_groups) > 0 ? {
            for ccg_key, ccg_value in netconfig_value.non_vcn_specific_gateways.cross_connect_groups : ccg_key => {
              compartment_id          = ccg_value.compartment_id != null ? ccg_value.compartment_id : ccg_value.compartment_key != null ? local.compartments[ccg_value.compartment_key].id : null
              customer_reference_name = ccg_value.customer_reference_name
              defined_tags            = ccg_value.defined_tags
              display_name            = ccg_value.display_name
              freeform_tags           = ccg_value.freeform_tags
              cross_connects = ccg_value.cross_connects != null ? length(ccg_value.cross_connectss) > 0 ? {
                for cc_key, cc_value in ccg_value.cross_connects : cc_key => {
                  compartment_id                                = cc_value.compartment_id != null ? cc_value.compartment_id : cc_value.compartment_key != null ? local.compartments[cc_value.compartment_key].id : null
                  location_name                                 = cc_value.location_name
                  port_speed_shape_name                         = cc_value.port_speed_shape_name
                  customer_reference_name                       = cc_value.customer_reference_name
                  defined_tags                                  = cc_value.defined_tags
                  display_name                                  = cc_value.display_name
                  far_cross_connect_or_cross_connect_group_id   = cc_value.far_cross_connect_or_cross_connect_group_id
                  far_cross_connect_or_cross_connect_group_key  = cc_value.far_cross_connect_or_cross_connect_group_key
                  freeform_tags                                 = cc_value.freeform_tags
                  near_cross_connect_or_cross_connect_group_id  = cc_value.near_cross_connect_or_cross_connect_group_id
                  near_cross_connect_or_cross_connect_group_key = cc_value.near_cross_connect_or_cross_connect_group_key
                }
              } : {} : {}
            }
          } : {} : {}

          inject_into_existing_drgs = netconfig_value.non_vcn_specific_gateways.inject_into_existing_drgs != null ? length(netconfig_value.non_vcn_specific_gateways.inject_into_existing_drgs) > 0 ? {
            for drg_key, drg_value in netconfig_value.non_vcn_specific_gateways.inject_into_existing_drgs : drg_key => {
              drg_id = drg_value.drg_id
              remote_peering_connections = drg_value.remote_peering_connections != null ? length(drg_value.remote_peering_connections) > 0 ? {
                for rpc_key, rpc_value in drg_value.remote_peering_connections : rpc_key => {
                  compartment_id   = rpc_value.compartment_id != null ? rpc_value.compartment_id : rpc_value.compartment_key != null ? local.compartments[rpc_value.compartment_key].id : null
                  defined_tags     = rpc_value.defined_tags
                  display_name     = rpc_value.display_name
                  freeform_tags    = rpc_value.freeform_tags
                  peer_id          = rpc_value.peer_id
                  peer_key         = rpc_value.peer_key
                  peer_region_name = rpc_value.peer_region_name
                }
              } : {} : {}
              drg_attachments         = drg_value.drg_attachments
              drg_route_tables        = drg_value.drg_route_tables
              drg_route_distributions = drg_value.drg_route_distributions
            }
          } : {} : {}

          network_firewalls_configuration = {
            network_firewalls = netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration != null ? netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration.network_firewalls != null ? length(netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration.network_firewalls) > 0 ? {
              for nfw_key, nfw_value in netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration.network_firewalls : nfw_key => {
                availability_domain         = nfw_value.availability_domain
                compartment_id              = nfw_value.compartment_id != null ? nfw_value.compartment_id : nfw_value.compartment_key != null ? local.compartments[nfw_value.compartment_key].id : null
                defined_tags                = nfw_value.defined_tags
                display_name                = nfw_value.display_name
                freeform_tags               = nfw_value.freeform_tags
                ipv4address                 = nfw_value.ipv4address
                ipv6address                 = nfw_value.ipv6address
                network_security_group_ids  = nfw_value.network_security_group_ids
                network_security_group_keys = nfw_value.network_security_group_keys
                subnet_id                   = nfw_value.subnet_id
                subnet_key                  = nfw_value.subnet_key
                network_firewall_policy_id  = nfw_value.network_firewall_policy_id
                network_firewall_policy_key = nfw_value.network_firewall_policy_key
              }
            } : {} : {} : null
            network_firewall_policies = netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration != null ? netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration.network_firewall_policies != null ? length(netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration.network_firewall_policies) > 0 ? {
              for nfwp_key, nfwp_value in netconfig_value.non_vcn_specific_gateways.network_firewalls_configuration.network_firewall_policies : nfwp_key => {
                compartment_id      = nfwp_value.compartment_id != null ? nfwp_value.compartment_id : nfwp_value.compartment_key != null ? local.compartments[nfwp_value.compartment_key].id : null
                defined_tags        = nfwp_value.defined_tags
                display_name        = nfwp_value.display_name
                freeform_tags       = nfwp_value.freeform_tags
                application_lists   = nfwp_value.application_lists
                decryption_profiles = nfwp_value.decryption_profiles
                decryption_rules    = nfwp_value.decryption_rules
                ip_address_lists    = nfwp_value.ip_address_lists
                mapped_secrets      = nfwp_value.mapped_secrets
                security_rules      = nfwp_value.security_rules
                url_lists           = nfwp_value.url_lists
              }
            } : null : null : null
          }
          l7_load_balancers = netconfig_value.non_vcn_specific_gateways.l7_load_balancers != null ? length(netconfig_value.non_vcn_specific_gateways.l7_load_balancers) > 0 ? {
            for l7_lbaas_key, l7_lbaas_value in netconfig_value.non_vcn_specific_gateways.l7_load_balancers : l7_lbaas_key => {
              compartment_id              = l7_lbaas_value.compartment_id != null ? l7_lbaas_value.compartment_id : l7_lbaas_value.compartment_key != null ? local.compartments[l7_lbaas_value.compartment_key].id : null
              display_name                = l7_lbaas_value.display_name
              shape                       = l7_lbaas_value.shape
              subnet_ids                  = l7_lbaas_value.subnet_ids
              subnet_keys                 = l7_lbaas_value.subnet_keys
              defined_tags                = l7_lbaas_value.defined_tags
              freeform_tags               = l7_lbaas_value.freeform_tags
              ip_mode                     = l7_lbaas_value.ip_mode
              is_private                  = l7_lbaas_value.is_private
              network_security_group_ids  = l7_lbaas_value.network_security_group_ids
              network_security_group_keys = l7_lbaas_value.network_security_group_keys
              reserved_ips_ids            = l7_lbaas_value.reserved_ips_ids
              reserved_ips_keys           = l7_lbaas_value.reserved_ips_keys
              shape_details               = l7_lbaas_value.shape_details
              backend_sets                = l7_lbaas_value.backend_sets
              cipher_suites               = l7_lbaas_value.cipher_suites
              path_route_sets             = l7_lbaas_value.path_route_sets
              host_names                  = l7_lbaas_value.host_names
              routing_policies            = l7_lbaas_value.routing_policies
              rule_sets                   = l7_lbaas_value.rule_sets
              certificates                = l7_lbaas_value.certificates
              listeners                   = l7_lbaas_value.listeners
            }
          } : {} : {}
        } : null
      }
    } : null : null
  } : null : null
}

module "terraform-oci-cis-landing-zone-network" {
  source                = "git::https://github.com/oracle-quickstart/terraform-oci-cis-landing-zone-networking.git?ref=v0.6.3"
  network_configuration = local.network_configuration
}