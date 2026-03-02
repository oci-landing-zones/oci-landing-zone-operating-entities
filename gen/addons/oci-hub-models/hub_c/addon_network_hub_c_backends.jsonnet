local pre = import 'addon_network_hub_c_pre.jsonnet';
local hub_c_nlb = import 'hub_c_nlb.libsonnet';
local fw1_trust_ip = 'NETWORK FIREWALL-1 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrr...';
local fw2_trust_ip = 'NETWORK FIREWALL-2 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrt...';
local fw1_untrust_ip = 'NETWORK FIREWALL-1 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsm...';
local fw2_untrust_ip = 'NETWORK FIREWALL-2 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsh...';

pre + {
  nlb_configuration+: {
    nlbs: hub_c_nlb._nlb('trust',
      hub_c_nlb._nlb_backends(
        'trust',
        fw1_trust_ip,
        fw2_trust_ip
      ))
      + hub_c_nlb._nlb('untrust',
        hub_c_nlb._nlb_backends(
          'untrust',
          fw1_untrust_ip,
          fw2_untrust_ip
        )),
  },
}
