// Hub C post-deployment overlay: route rule changes that reference NLB private IP OCIDs.
// Hub C uses 3rd party firewalls behind NLBs (Untrust NLB and Trust NLB).
local ip = import '../subnetting.libsonnet';
local untrust_nlb_ip = 'UNTRUST NLB PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljtgvl...';
local trust_nlb_ip = 'TRUST NLB PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljt53k...';

{
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-IGW-KEY'+: {
                route_rules: {
                  'rt-igw-ingress': {
                    description: "Route to Public LoadBalancer's subnet through Untrust NLB and Firewalls",
                    destination: ip.hub_c.lb_sn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: untrust_nlb_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-INGRESS-KEY'+: {
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through Trust NLB and Firewalls',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: trust_nlb_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules: {
                  'rt-internet': {
                    description: 'Route to the Internet through Untrust NLB and Firewalls',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: untrust_nlb_ip,
                  },
                },
              },

              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: {
                  'rt-internet': {
                    description: 'Route to the Internet through Trust NLB and Firewalls',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_id: trust_nlb_ip,
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
