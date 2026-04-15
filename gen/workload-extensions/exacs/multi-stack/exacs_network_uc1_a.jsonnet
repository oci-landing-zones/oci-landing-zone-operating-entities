local exacs_network_hub_a_pre_patch = import 'exacs_network_uc1_a_pre.jsonnet';

local pre_route_rules =
  exacs_network_hub_a_pre_patch.network_configuration.network_configuration_categories['1-shared-exacs']
  .vcns['VCN-FRA-LZ-SHARED-EXACS-KEY']
  .route_tables['RT-FRA-LZ-SHARED-EXACS-GENERIC-KEY']
  .route_rules;

local exacs_network_hub_a_patch = exacs_network_hub_a_pre_patch {
  network_configuration+: {
    network_configuration_categories+: {
      '1-shared-exacs'+: {
        vcns+: {
          'VCN-FRA-LZ-SHARED-EXACS-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-SHARED-EXACS-GENERIC-KEY'+: {
                route_rules:
                  {
                    drg_route: {
                      description: 'Route to the 0.0.0.0/0 through DRG',
                      destination: '0.0.0.0/0',
                      destination_type: 'CIDR_BLOCK',
                      network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                    },
                  } + pre_route_rules,
              },
            },
          },
        },
      },
    },
  },
};


exacs_network_hub_a_patch
