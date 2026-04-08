local oneoe_network_hub_e_base = import '/Users/paolajuarez/Desktop/Terraform/code/one-oe/oci-landing-zone-operating-entities/blueprints/one-oe/runtime/one-stack/oneoe_network_hub_e.json';

local exacs_network_hub_e_patch = oneoe_network_hub_e_base {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZ-HUB-KEY'+: {
              drg_attachments+: {
                'DRGATT-FRA-LZ-SHARED-EXACS-KEY': {
                  display_name: 'drgatt-fra-lz-shared-exacs',
                  drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',
                  network_details: {
                    type: 'VCN',
                    attached_resource_key: 'VCN-FRA-LZ-SHARED-EXACS-KEY',
                  },
                },
              },
              drg_route_distributions+: {
                'DRGRD-FRA-LZ-HUB-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-SHARED-EXACS-KEY': {
                      action: 'ACCEPT',
                      priority: 30,
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-SHARED-EXACS-KEY',
                      },
                    },
                  },
                },
                'DRGRD-FRA-LZ-SPOKE-KEY'+: {
                  statements+: {
                    'ROUTE-TO-VCN-S-SHARED-EXACS-KEY': {
                      action: 'ACCEPT',
                      priority: 40,
                      match_criteria: {
                        match_type: 'DRG_ATTACHMENT_ID',
                        attachment_type: 'VCN',
                        drg_attachment_key: 'DRGATT-FRA-LZ-SHARED-EXACS-KEY',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: {
                  'rt-fra-shared-exacs': {
                    description: 'Route to VCN Shared exacs through DRG',
                    destination: '10.0.24.0/21',
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
};

exacs_network_hub_e_patch
