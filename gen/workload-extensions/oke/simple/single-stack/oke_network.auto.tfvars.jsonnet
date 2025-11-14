local one_oe_hub_e = import '../../../../../blueprints/one-oe/runtime/one-stack/oci_open_lz_hub_e_network.auto.tfvars.json';
local oke_network = import '../oke_network.libsonnet';

one_oe_hub_e + oke_network + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZP-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZP-HUB-VCN-LB-KEY'+: {
                route_rules+: {
                  'rt-vcn-fra-p-oke': {
                    description: 'Route to VCN Prod OKE through DRG',
                    destination: '10.0.80.0/21',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-FRA-LZP-HUB-VCN-MGMT-KEY'+: {
                route_rules+: {
                  'rt-vcn-fra-p-oke': {
                    description: 'Route to VCN Prod OKE through DRG',
                    destination: '10.0.80.0/21',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
            },
          },
        },
        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZP-HUB-KEY'+: {
              drg_attachments+: {
                'DRGATT-FRA-VCN-PROD-OKE-KEY': {
                  display_name: 'drgatt-vcn-fra-lzp-p-platform-oke',
                  drg_route_table_key: 'DRGRT-FRA-LZP-SPOKES-KEY',

                  network_details: {
                    type: 'VCN',
                    attached_resource_key: 'VCN-FRA-LZP-P-PLATFORM-OKE-KEY',
                  },
                },
              },
              drg_route_distributions+: {
                'IRTD-FRA-LZP-HUB-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-PROD-OKE-KEY': {
                      priority: 30,
                      action: 'ACCEPT',
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-VCN-PROD-OKE-KEY',
                      },
                    },
                  },
                },
                'IRTD-FRA-LZP-SPOKE-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-S-PROD-OKE-KEY': {
                      priority: 40,
                      action: 'ACCEPT',
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-VCN-PROD-OKE-KEY',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      oke+: {
        vcns+: {
          'VCN-FRA-LZP-P-PLATFORM-OKE-KEY'+: {
            vcn_specific_gateways+: {
              nat_gateways: {
                'NGW-PROD-OKE-KEY': {
                  display_name: 'ngw-fra-lzp-prod-oke',
                  block_traffic: false,
                },
              },
            },
            route_tables+: {
              'RT-PROD-OKE-CP-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-PROD-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-PROD-OKE-INT-LB-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-PROD-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-PROD-OKE-PODS-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-PROD-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
              'RT-PROD-OKE-WORKERS-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-PROD-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZP-HUB-KEY',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
