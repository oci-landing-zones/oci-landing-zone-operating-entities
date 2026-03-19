local oke_network = import '../oke_network.libsonnet';

oke_network {
  network_configuration+: {
    network_configuration_categories+: {
      oke+: {
        non_vcn_specific_gateways+: {
          inject_into_existing_drg+: {
            'DRG-FRA-LZ-HUB-KEY'+: {
              drg_key: 'DRG-FRA-LZ-HUB-KEY',

              drg_attachments+: {
                'DRG-VCN-OKE-PROD-KEY': {
                  display_name: 'drgatt-vcn-fra-lz-prod-platform-oke',
                  drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',

                  network_details: {
                    type: 'VCN',
                    attached_resource_key: 'VCN-FRA-LZ-PROD-PLATFORM-OKE-KEY',
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
