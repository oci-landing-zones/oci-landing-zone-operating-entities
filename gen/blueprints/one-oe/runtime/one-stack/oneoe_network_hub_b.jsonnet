local pre = import 'oneoe_network_hub_b_pre.jsonnet';
local post = import '../../../../addons/oci-hub-models/hub_b/hub_b_post.libsonnet';
local ip = (import '../../../../addons/oci-hub-models/subnetting.libsonnet');
local s = (import 'oneoe_spokes.libsonnet')(ip.hub_b.mgmt_sn, ip.hub_b.lb_sn);
local nfw_ip = 'OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljs...';

pre + post + {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-INGRESS-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_nfw(nfw_ip),
              },

              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_nfw(nfw_ip),
              },

              'RT-FRA-LZ-HUB-NATGW-KEY'+: {
                route_rules+: s._hub_spoke_routes_via_nfw(nfw_ip),
              },
            },
          },
        },
      },
    },
  },
}
