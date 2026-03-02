// OCI Landing Zone subnetting allocation.
// Scheme: /12 base → 4 bits OE → 2 bits Env → 3 bits VCN → 3 bits Subnet → 8 bits Host
{
  // --- VCN CIDRs ---
  hub_vcn: '10.0.0.0/21',
  prod_vcn: '10.0.64.0/21',
  preprod_vcn: '10.0.128.0/21',

  // --- Prod spoke subnets ---
  prod_web_sn: '10.0.64.0/24',
  prod_app_sn: '10.0.65.0/24',
  prod_db_sn: '10.0.66.0/24',
  prod_infra_sn: '10.0.67.0/24',

  // --- PreProd spoke subnets ---
  preprod_web_sn: '10.0.128.0/24',
  preprod_app_sn: '10.0.129.0/24',
  preprod_db_sn: '10.0.130.0/24',
  preprod_infra_sn: '10.0.131.0/24',

  // --- L7 LB example backend IPs ---
  prod_web_backend1_ip: '10.0.64.10',
  prod_web_backend2_ip: '10.0.64.20',

  // --- Hub Model E subnets ---
  hub_e: {
    lb_sn: '10.0.0.0/24',
    mgmt_sn: '10.0.1.0/24',
    mon_sn: '10.0.2.0/24',
    dns_sn: '10.0.3.0/24',
    bastion_ip: '10.0.1.123/32',
  },

  // --- Hub Model B subnets ---
  hub_b: {
    lb_sn: '10.0.0.0/24',
    fw_sn: '10.0.1.0/24',
    mgmt_sn: '10.0.2.0/24',
    mon_sn: '10.0.3.0/24',
    dns_sn: '10.0.4.0/24',
    bastion_ip: '10.0.2.123/32',
    nfw_ip: '10.0.1.10',
  },

  // --- Hub Model A subnets ---
  hub_a: {
    fw_dmz_sn: '10.0.0.0/24',
    lb_sn: '10.0.1.0/24',
    fw_int_sn: '10.0.2.0/24',
    mgmt_sn: '10.0.3.0/24',
    mon_sn: '10.0.4.0/24',
    dns_sn: '10.0.5.0/24',
    bastion_ip: '10.0.3.123/32',
    nfw_dmz_ip: '10.0.0.10',
    nfw_int_ip: '10.0.2.10',
  },

  // --- Hub Model C subnets ---
  hub_c: {
    untrust_sn: '10.0.0.0/24',
    trust_sn: '10.0.1.0/24',
    lb_sn: '10.0.2.0/24',
    mgmt_sn: '10.0.3.0/24',
    mon_sn: '10.0.4.0/24',
    dns_sn: '10.0.5.0/24',
    bastion_ip: '10.0.3.123/32',
  },
}
