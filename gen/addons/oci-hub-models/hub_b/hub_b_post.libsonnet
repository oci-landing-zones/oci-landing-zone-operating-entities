// Hub B post-deployment overlay: route rule changes that reference NFW private IP OCID.
// Shared between addon and one-oe non-pre files.
local ip = import '../subnetting.libsonnet';
local nfw_ip = 'OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljs...';

{
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-INGRESS-KEY'+: {
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the OCI Network Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_ip,
                  },

                  'rt-vcn-fra-hub-lb-sn': {
                    description: 'Route to Public LB through the OCI Network Firewall',
                    destination: ip.hub_b.lb_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: {
                  'rt-internet': {
                    description: 'Route to the Internet through the OCI Network Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-NATGW-KEY'+: {
                route_rules: {
                  'rt-vcn-fra-hub-mgmt-sn': {
                    description: 'Route to mgmt subnet in Hub VCN through OCI Network Firewall',
                    destination: ip.hub_b.mgmt_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_ip,
                  },

                  'rt-vcn-fra-hub-logs-sn': {
                    description: 'Route to mon subnet in Hub VCN through OCI Network Firewall',
                    destination: ip.hub_b.mon_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_ip,
                  },

                  'rt-vcn-fra-hub-dns-sn': {
                    description: 'Route to dns subnet in Hub VCN through OCI Network Firewall',
                    destination: ip.hub_b.dns_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_ip,
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
