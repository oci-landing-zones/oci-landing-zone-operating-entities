// Hub C backends overlay: adds firewall VM backends to the NLB configurations.
// Applied on top of the pre-deployment config (not the post overlay).
local fw1_trust_ip = 'NETWORK FIREWALL-1 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrr...';
local fw2_trust_ip = 'NETWORK FIREWALL-2 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrt...';
local fw1_untrust_ip = 'NETWORK FIREWALL-1 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsm...';
local fw2_untrust_ip = 'NETWORK FIREWALL-2 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsh...';

{
  nlb_configuration+: {
    nlbs+: {
      'NLB-FRA-LZ-HUB-TRUST-KEY'+: {
        listeners+: {
          'NLBLSNR-FRA-LZ-HUB-TRUST-KEY'+: {
            backend_set+: {
              backends: {
                'FW-TRUST-BACKEND-01': {
                  name: 'fw-trust-backend-01',
                  port: '0',
                  is_backup: 'false',
                  is_drain: 'false',
                  is_offline: 'false',
                  target_id: fw1_trust_ip,
                  weight: '1',
                },

                'FW-TRUST-BACKEND-02': {
                  name: 'fw-trust-backend-02',
                  port: '0',
                  is_backup: 'false',
                  is_drain: 'false',
                  is_offline: 'false',
                  target_id: fw2_trust_ip,
                  weight: '1',
                },
              },
            },
          },
        },
      },

      'NLB-FRA-LZ-HUB-UNTRUST-KEY'+: {
        listeners+: {
          'NLBLSNR-FRA-LZ-HUB-UNTRUST-KEY'+: {
            backend_set+: {
              backends: {
                'FW-UNTRUST-BACKEND-01': {
                  name: 'fw-untrust-backend-01',
                  port: '0',
                  is_backup: 'false',
                  is_drain: 'false',
                  is_offline: 'false',
                  target_id: fw1_untrust_ip,
                  weight: '1',
                },

                'FW-UNTRUST-BACKEND-02': {
                  name: 'fw-untrust-backend-02',
                  port: '0',
                  is_backup: 'false',
                  is_drain: 'false',
                  is_offline: 'false',
                  target_id: fw2_untrust_ip,
                  weight: '1',
                },
              },
            },
          },
        },
      },
    },
  },
}
