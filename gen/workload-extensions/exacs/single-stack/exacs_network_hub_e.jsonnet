local one_oe = import '../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json';
local exacs_network_hub_e_patch =
{
  "network_configuration": {
    "network_configuration_categories": {
      "0-shared": {
        "non_vcn_specific_gateways": {
          "dynamic_routing_gateways": {
            "DRG-FRA-LZ-HUB-KEY": {
              "drg_attachments": {
                "DRGATT-FRA-LZ-SHARED-EXACS-KEY": {
                  "display_name": "drgatt-fra-lz-shared-exacs",
                  "drg_route_table_key": "DRGRT-FRA-LZ-SPOKES-KEY",
                  "network_details": {
                    "type": "VCN",
                    "attached_resource_key": "VCN-FRA-LZ-SHARED-EXACS-KEY"
                  }
                }
              },
              "drg_route_distributions": {
                "DRGRD-FRA-LZ-HUB-KEY": {
                  "statements": {
                    "ROUTE-TO-VCN-SHARED-EXACS-KEY": {
                      "action": "ACCEPT",
                      "priority": 30,
                      "match_criteria": {
                        "match_type": "DRG_ATTACHMENT_ID",
                        "attachment_type": "VCN",
                        "drg_attachment_key": "DRGATT-FRA-LZ-SHARED-EXACS-KEY"
                      }
                    }
                  }
                },
                "DRGRD-FRA-LZ-SPOKE-KEY": {
                  "statements": {
                    "ROUTE-TO-VCN-S-SHARED-EXACS-KEY": {
                      "action": "ACCEPT",
                      "priority": 40,
                      "match_criteria": {
                        "match_type": "DRG_ATTACHMENT_ID",
                        "attachment_type": "VCN",
                        "drg_attachment_key": "DRGATT-FRA-LZ-SHARED-EXACS-KEY"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "vcns": {
          "VCN-FRA-LZ-HUB-KEY": {
            "route_tables": {
              "RT-FRA-LZ-HUB-LB-KEY": {
                "route_rules": {
                  "rt-fra-shared-exacs": {
                    "description": "Route to VCN Shared exacs through DRG",
                    "destination": "10.0.24.0/21",
                    "destination_type": "CIDR_BLOCK",
                    "network_entity_key": "DRG-FRA-LZ-HUB-KEY"
                  }
                }
              }
            }
          }
        }
      },
      "1-shared-exacs": {
        "category_compartment_id": "CMP-LZ-NETWORK-KEY",
        "vcns": {
          "VCN-FRA-LZ-SHARED-EXACS-KEY": {
            "display_name": "vcn-fra-lz-shared-exacs",
            "cidr_blocks": [
              "10.0.24.0/21"
            ],
            "dns_label": "vcnfralzsexacs",
            "block_nat_traffic": false,
            "is_attach_drg": false,
            "is_create_igw": false,
            "is_ipv6enabled": false,
            "is_oracle_gua_allocation_enabled": false,
            "subnets": {
              "SN-FRA-LZ-SHARED-EXACS-DB-KEY": {
                "display_name": "sn-fra-lz-shared-exacs-db",
                "cidr_block": "10.0.24.0/24",
                "dns_label": "snfrasexacsdb",
                "dhcp_options_key": "default_dhcp_options",
                "prohibit_internet_ingress": true,
                "prohibit_public_ip_on_vnic": true,
                "route_table_key": "RT-FRA-LZ-SHARED-EXACS-GENERIC-KEY",
                "security_list_keys": [
                  "SL-FRA-LZ-SHARED-EXACS-GENERIC-KEY"
                ]
              },
              "SN-FRA-LZ-SHARED-EXACS-BCK-KEY": {
                "display_name": "sn-fra-lz-shared-exacs-bck",
                "cidr_block": "10.0.25.0/24",
                "dns_label": "snfrasexacsbck",
                "dhcp_options_key": "default_dhcp_options",
                "prohibit_internet_ingress": true,
                "prohibit_public_ip_on_vnic": true,
                "route_table_key": "RT-FRA-LZ-SHARED-EXACS-GENERIC-KEY",
                "security_list_keys": [
                  "SL-FRA-LZ-SHARED-EXACS-GENERIC-KEY"
                ]
              }
            },
            "route_tables": {
              "RT-FRA-LZ-SHARED-EXACS-GENERIC-KEY": {
                "display_name": "nsg-fra-lz-shared-exacs-db",
                "route_rules": {
                  "drg_route": {
                    "description": "Route to the 0.0.0.0/0 through DRG",
                    "destination": "0.0.0.0/0",
                    "destination_type": "CIDR_BLOCK",
                    "network_entity_key": "DRG-FRA-LZ-HUB-KEY"
                  },
                  "sgw_route": {
                    "description": "Route to Oracle Services Network through Service GW",
                    "destination": "all-services",
                    "destination_type": "SERVICE_CIDR_BLOCK",
                    "network_entity_key": "SGW-FRA-LZ-SHARED-EXACS-KEY"
                  }
                }
              }
            },
            "default_security_list": {
              "ingress_rules": [],
              "egress_rules": []
            },
            "security_lists": {
              "SL-FRA-LZ-SHARED-EXACS-GENERIC-KEY": {
                "display_name": "rt-fra-lz-shared-exacs-generic",
                "ingress_rules": [
                  {
                    "description": "ICMP type 3 code 4",
                    "src": "0.0.0.0/0",
                    "src_type": "CIDR_BLOCK",
                    "protocol": "ICMP",
                    "icmp_type": 3,
                    "icmp_code": 4,
                    "stateless": false
                  },
                  {
                    "description": "ICMP type 3",
                    "src": "10.0.24.0/21",
                    "src_type": "CIDR_BLOCK",
                    "protocol": "ICMP",
                    "icmp_type": 3,
                    "stateless": false
                  },
                  {
                    "description": "Allow inbound ICMP type 8 (Echo) from Hub VCN",
                    "src": "10.0.0.0/21",
                    "src_type": "CIDR_BLOCK",
                    "protocol": "ICMP",
                    "icmp_type": 8,
                    "icmp_code": 0,
                    "stateless": false
                  }
                ],
                "egress_rules": [
                  {
                    "description": "Allow all outbound traffic to 0.0.0.0/0 over ALL protocols",
                    "dst": "0.0.0.0/0",
                    "dst_type": "CIDR_BLOCK",
                    "protocol": "ALL",
                    "stateless": false
                  },
                  {
                    "description": "Allow outbound traffic to Oracle Services Network over ALL protocols",
                    "dst": "all-services",
                    "dst_type": "SERVICE_CIDR_BLOCK",
                    "protocol": "ALL",
                    "stateless": false
                  }
                ]
              }
            },
            "network_security_groups": {},
            "vcn_specific_gateways": {
              "service_gateways": {
                "SGW-FRA-LZ-SHARED-EXACS-KEY": {
                  "display_name": "sl-fra-lz-shared-exacs-generic",
                  "services": "all-services"
                }
              }
            }
          }
        }
      }
    }
  }
}
;

std.mergePatch(one_oe, exacs_network_hub_e_patch)
