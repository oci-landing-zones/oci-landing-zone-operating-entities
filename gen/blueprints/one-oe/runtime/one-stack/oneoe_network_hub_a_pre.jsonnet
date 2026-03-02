local hub = import '../../../../addons/oci-hub-models/hub_a/addon_network_hub_a_pre.jsonnet';
local ip = (import '../../../../addons/oci-hub-models/subnetting.libsonnet');
local s = (import 'oneoe_spokes.libsonnet')(ip.hub_a.mgmt_sn, ip.hub_a.lb_sn);

hub {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_drg,
              },

              'RT-FRA-LZ-HUB-FW-INT-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_drg,
              },

              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_drg,
              },
            },

            network_security_groups+: {
              'NSG-FRA-LZ-HUB-FW-INT-KEY'+: {
                ingress_rules+: s._nsg_fw_spoke_ingress,
              },
            },
          },
        },

        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZ-HUB-KEY'+: {
              drg_attachments+: s._drg_spoke_attachments,

              drg_route_distributions+: {
                'DRGRD-FRA-LZ-HUB-KEY'+: {
                  statements+: s._drg_hub_dist_stmts,
                },
              },
            },
          },
        },
      },

      '1-prod': s._prod_category,
      '2-preprod': s._preprod_category,
    },
  },
}
