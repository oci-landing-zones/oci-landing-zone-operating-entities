local pre = import 'oneoe_network_hub_a_pre.jsonnet';
local post = import '../../../../addons/oci-hub-models/hub_a/hub_a_post.libsonnet';
local ip = (import '../../../../addons/oci-hub-models/subnetting.libsonnet');
local s = (import 'oneoe_spokes.libsonnet')(ip.hub_a.mgmt_sn, ip.hub_a.lb_sn);
local nfw_int_ip = 'Internal OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljs...';

pre + post + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              // hub_a_post replaces route_rules (without +) on LB, so re-add spoke DRG routes
              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_drg,
              },

              'RT-FRA-LZ-HUB-INGRESS-KEY'+: {
                route_rules+: {
                  'rt-fra-prod-projects': {
                    description: 'Route to VCN Prod Projects through the Internal OCI Network Firewall',
                    destination: ip.prod_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },

                  'rt-fra-preprod-projects': {
                    description: 'Route to VCN PreProd Projects through the Internal OCI Network Firewall',
                    destination: ip.preprod_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-NATGW-KEY'+: {
                route_rules+: {
                  'rt-fra-prod-projects': {
                    description: 'Route to VCN Prod Projects through Internal OCI Network Firewall',
                    destination: ip.prod_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },

                  'rt-fra-preprod-projects': {
                    description: 'Route to VCN PreProd Projects through Internal OCI Network Firewall',
                    destination: ip.preprod_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
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
