// Hub A post-deployment overlay: route rule changes that reference NFW private IP OCIDs.
// Hub A has TWO firewalls: DMZ (north-south inbound) and Internal (east-west / outbound).
local ip = import '../subnetting.libsonnet';
local nfw_dmz_ip = 'DMZ OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.vrdnynvr...';
local nfw_int_ip = 'Internal OCI NFW PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljs...';

{
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-IGW-KEY'+: {
                route_rules: {
                  'rt-vcn-fra-hub-lb-sn': {
                    description: 'Route to lb subnet in Hub VCN through DMZ OCI Network Firewall',
                    destination: ip.hub_a.lb_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_dmz_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-INGRESS-KEY'+: {
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the Internal OCI Network Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through the DMZ Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_dmz_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: {
                  'rt-internet': {
                    description: 'Route to the Internet through the Internal OCI Network Firewall',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-NATGW-KEY'+: {
                route_rules: {
                  'rt-vcn-fra-hub-mgmt-sn': {
                    description: 'Route to mgmt subnet in Hub VCN through Internal OCI Network Firewall',
                    destination: ip.hub_a.mgmt_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },

                  'rt-vcn-fra-hub-logs-sn': {
                    description: 'Route to mon subnet in Hub VCN through Internal OCI Network Firewall',
                    destination: ip.hub_a.mon_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: nfw_int_ip,
                  },

                  'rt-vcn-fra-hub-dns-sn': {
                    description: 'Route to dns subnet in Hub VCN through Internal OCI Network Firewall',
                    destination: ip.hub_a.dns_sn,
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
