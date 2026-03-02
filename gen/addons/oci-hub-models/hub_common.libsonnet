// Shared hub VCN security list fragments common to all hub models (A, B, C, E).
// All fields are hidden (::) so they don't appear in output directly.
local ip = import 'subnetting.libsonnet';

{
  // Shared FW security list (identical ingress across A, B variants)
  _sl_fw:: {
    display_name: 'sl-fra-lz-hub-fw',
    egress_rules: [],

    ingress_rules: [
      {
        description: 'ICMP type 3 code 4',
        src: '0.0.0.0/0',
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 3,
        icmp_code: 4,
        stateless: false,
      },
      {
        description: 'ICMP type 3',
        src: ip.hub_vcn,
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 3,
        stateless: false,
      },
      {
        description: 'ICMP type 8 (Echo)',
        src: ip.hub_vcn,
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 8,
        icmp_code: 0,
        stateless: false,
      },
    ],
  },

  // Shared MGMT security list factory (bastion IP varies by variant)
  _sl_mgmt(bastion_ip):: {
    display_name: 'sl-fra-lz-hub-mgmt',

    egress_rules: [
      {
        description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
        dst: '0.0.0.0/0',
        dst_type: 'CIDR_BLOCK',
        protocol: 'ALL',
        stateless: false,
      },
    ],

    ingress_rules: [
      {
        description: 'ICMP type 3 code 4',
        src: '0.0.0.0/0',
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 3,
        icmp_code: 4,
        stateless: false,
      },
      {
        description: 'ICMP type 3',
        src: ip.hub_vcn,
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 3,
        stateless: false,
      },
      {
        description: 'ICMP type 8 (Echo)',
        src: ip.hub_vcn,
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 8,
        icmp_code: 0,
        stateless: false,
      },
      {
        description: 'EXAMPLE: Allow inbound traffic from the Bastion Service private endpoint IP address',
        src: bastion_ip,
        src_type: 'CIDR_BLOCK',
        dst_port_max: 22,
        dst_port_min: 22,
        protocol: 'TCP',
        stateless: false,
      },
    ],
  },
}
