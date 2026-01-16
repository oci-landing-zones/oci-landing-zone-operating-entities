local one_oe_hub_e = import '../../../../../blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json';
local oke_network = import '../oke_network.libsonnet';

one_oe_hub_e + oke_network + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: {
                  'rt-fra-vcn-prod-oke': {
                    description: 'Route to VCN Prod OKE through DRG',
                    destination: '10.0.80.0/21',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: {
                  'rt-fra-vcn-prod-oke': {
                    description: 'Route to VCN Prod OKE through DRG',
                    destination: '10.0.80.0/21',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
            },
          },
        },
        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZ-HUB-KEY'+: {
              drg_attachments+: {
                'DRGATT-FRA-LZ-PROD-PLATFORM-OKE-KEY': {
                  display_name: 'drgatt-fra-lz-prod-platform-oke',
                  drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',

                  network_details: {
                    type: 'VCN',
                    attached_resource_key: 'VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                },
              },
              drg_route_distributions+: {
                'DRGRD-FRA-LZ-HUB-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-PROD-PLATFORM-OKE-KEY': {
                      priority: 30,
                      action: 'ACCEPT',
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                      },
                    },
                  },
                },
                'DRGRD-FRA-LZ-SPOKE-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-S-PROD-PLATFORM-OKE-KEY': {
                      priority: 40,
                      action: 'ACCEPT',
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PLATFORM-OKE-KEY',
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
          'VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY'+: {
            vcn_specific_gateways+: {
              nat_gateways: {
                'NGW-FRA-LZ-PROD-PLATFORM-OKE-KEY': {
                  display_name: 'ngw-fra-lz-prod-platform-oke',
                  block_traffic: false,
                },
              },
            },
            route_tables+: {
              'RT-FRA-LZ-PROD-OKE-CP-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
              'RT-FRA-LZ-PROD-OKE-INT-LB-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
              'RT-FRA-LZ-PROD-OKE-PODS-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                },
              },
              'RT-FRA-LZ-PROD-OKE-WORKERS-KEY'+: {
                route_rules+: {
                  default_route: {
                    description: 'Default route to internet through NAT Gateway',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-PROD-PLATFORM-OKE-KEY',
                  },
                  hub_route: {
                    description: 'Route to Hub and other networks through DRG',
                    destination: '10.0.0.0/16',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
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
