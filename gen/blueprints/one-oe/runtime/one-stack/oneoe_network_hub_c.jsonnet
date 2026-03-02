local pre = import 'oneoe_network_hub_c_pre.jsonnet';
local post = import '../../../../addons/oci-hub-models/hub_c/hub_c_post.libsonnet';
local ip = (import '../../../../addons/oci-hub-models/subnetting.libsonnet');
local s = (import 'oneoe_spokes.libsonnet')(ip.hub_c.mgmt_sn, ip.hub_c.lb_sn);
local trust_nlb_ip = 'TRUST NLB PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljt53k...';

pre + post + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-INGRESS-KEY'+: {
                route_rules+: {
                  'rt-fra-prod-projects': {
                    description: 'Route to VCN Prod Projects through Trust NLB and Firewalls',
                    destination: ip.prod_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: trust_nlb_ip,
                  },

                  'rt-fra-preprod-projects': {
                    description: 'Route to VCN Preprod Projects through Trust NLB and Firewalls',
                    destination: ip.preprod_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: trust_nlb_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_drg,
              },
            },
          },
        },
      },
    },
  },
}
