// hub_common.libsonnet — Shared hub VCN building blocks for all hub models (A, B, C, E).
// All fields are hidden (::) so they don't appear in output directly.
//
// Exports:
//   _icmp_ingress_rules(own_vcn_cidr, management_cidr=null) — 3-rule ICMP ingress array
//   _nsg_egress_all_protocols       — NSG egress: all protocols to 0.0.0.0/0
//   _nsg_egress_tcp_only            — NSG egress: TCP only to 0.0.0.0/0
//   _mgmt_security_list(bastion_ip) — MGMT SL with ICMP + SSH from bastion (returns keyed object)
//   _empty_default_security_list    — Empty default SL (egress=[], ingress=[])
//   _hub_vcn(ip_config, extra_subnets={}) — Base hub VCN with common subnets merged
//   _internet_gateway(name, route_table_key=null) — IGW (key auto-derived from name)
//   _nat_gateway(name, route_table_key=null)      — NAT GW (key auto-derived from name)
//   _service_gateway(name)          — Service GW (key auto-derived from name)
//   _services_route_via_sgw                  — Route rule to Oracle Services via SGW
//   _internet_route_via_natgw                — Route rule to 0.0.0.0/0 via NAT GW
//   _internet_route_via_igw                  — Route rule to 0.0.0.0/0 via IGW
//   _firewall_hub_drg               — DRG for firewall hubs (A, B, C)
//   _icmp_sl(name)                  — ICMP-only security list (key auto-derived from name)
//   _natgw_firewall_routes(ip_config, entity_id, fw_desc) — NATGW routes through firewall
//
// Architecture notes:
//   Hub-specific subnets (firewall, NLB) are defined in each hub's own file.
//   Common subnets (LB, MGMT, MON, DNS) are shared via _hub_vcn.
//   See gen/CONVENTIONS.md for composition patterns and design rationale.
local ip = import 'subnetting.libsonnet';

{
  // --- ICMP ingress rules ---

  // Standard 3-rule ICMP ingress (type 3 code 4, type 3, type 8) used by FW/LB/MGMT security lists.
  //   own_vcn_cidr: source for Type 3 rules (your VCN's CIDR).
  //   management_cidr: source for Type 8 Echo (the management network that monitors you).
  //     null (default) = same as own_vcn_cidr (hub case).
  //     Set explicitly for spokes where monitoring comes from hub VCN.
  _icmp_ingress_rules(own_vcn_cidr, management_cidr=null):: [
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
      src: own_vcn_cidr,
      src_type: 'CIDR_BLOCK',
      protocol: 'ICMP',
      icmp_type: 3,
      stateless: false,
    },
    {
      description:
        if management_cidr != null
        then 'Allow inbound ICMP type 8 (Echo) from Hub VCN'
        else 'Allow inbound ICMP type 8 (Echo)',
      src:
        if management_cidr != null
        then management_cidr
        else own_vcn_cidr,
      src_type: 'CIDR_BLOCK',
      protocol: 'ICMP',
      icmp_type: 8,
      icmp_code: 0,
      stateless: false,
    },
  ],

  // --- NSG egress patterns ---

  _nsg_egress_all_protocols:: {
    anywhere: {
      description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
      dst: '0.0.0.0/0',
      dst_type: 'CIDR_BLOCK',
      protocol: 'ALL',
      stateless: false,
    },
  },

  _nsg_egress_tcp_only:: {
    anywhere: {
      description: 'Allow all outbound traffic to 0.0.0.0/0 over TCP',
      dst: '0.0.0.0/0',
      dst_type: 'CIDR_BLOCK',
      protocol: 'TCP',
      stateless: false,
    },
  },

  // --- Security lists ---

  _mgmt_security_list(bastion_ip):: {
    'SL-FRA-LZ-HUB-MGMT-KEY': {
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

      ingress_rules: $._icmp_ingress_rules(ip.hub_vcn) + [
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
  },

  _empty_default_security_list:: {
    egress_rules: [],
    ingress_rules: [],
  },

  // --- VCN ---

  // Base hub VCN with LB + MGMT/MON/DNS subnets merged with any hub-specific subnets.
  _hub_vcn(ip_config, extra_subnets={}):: {
    display_name: 'vcn-fra-lz-hub',
    cidr_blocks: [ip.hub_vcn],
    dns_label: 'vcnfralzhub',
    block_nat_traffic: false,
    is_attach_drg: false,
    is_create_igw: false,
    is_ipv6enabled: false,
    is_oracle_gua_allocation_enabled: false,

    subnets: extra_subnets + {
      'SN-FRA-LZ-HUB-LB-KEY': {
        display_name: 'sn-fra-lz-hub-lb',
        dns_label: 'snfrahublb',
        cidr_block: ip_config.lb_sn,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: false,
        prohibit_public_ip_on_vnic: false,
        route_table_key: 'RT-FRA-LZ-HUB-LB-KEY',
        security_list_keys: ['SL-FRA-LZ-HUB-LB-KEY'],
      },

      'SN-FRA-LZ-HUB-MGMT-KEY': {
        display_name: 'sn-fra-lz-hub-mgmt',
        dns_label: 'snfrahubmgmt',
        cidr_block: ip_config.mgmt_sn,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
        security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
      },

      'SN-FRA-LZ-HUB-MON-KEY': {
        display_name: 'sn-fra-lz-hub-mon',
        dns_label: 'snfrahubmon',
        cidr_block: ip_config.mon_sn,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
        security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
      },

      'SN-FRA-LZ-HUB-DNS': {
        display_name: 'sn-fra-lz-hub-dns',
        dns_label: 'snfrahubdns',
        cidr_block: ip_config.dns_sn,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: 'RT-FRA-LZ-HUB-MGMT-KEY',
        security_list_keys: ['SL-FRA-LZ-HUB-MGMT-KEY'],
      },
    },
  },

  // --- Gateways ---

  _internet_gateway(name, route_table_key=null):: {
    [std.asciiUpper(name) + '-KEY']: { display_name: name }
      + (if route_table_key != null then { route_table_key: route_table_key } else {}),
  },

  _nat_gateway(name, route_table_key=null):: {
    [std.asciiUpper(name) + '-KEY']: { display_name: name }
      + (if route_table_key != null then { route_table_key: route_table_key } else {}),
  },

  _service_gateway(name):: {
    [std.asciiUpper(name) + '-KEY']: { display_name: name, services: 'all-services' },
  },

  // --- Route rules ---

  _services_route_via_sgw:: {
    'rt-sgw': {
      description: 'Route to Oracle Services Network through Service GW',
      destination: 'all-services',
      destination_type: 'SERVICE_CIDR_BLOCK',
      network_entity_key: 'SGW-FRA-LZ-HUB-KEY',
    },
  },

  _internet_route_via_natgw:: {
    'rt-natgw': {
      description: 'Route to Internet through NAT GW',
      destination: '0.0.0.0/0',
      destination_type: 'CIDR_BLOCK',
      network_entity_key: 'NGW-FRA-LZ-HUB-KEY',
    },
  },

  _internet_route_via_igw:: {
    'rt-igw': {
      description: 'Route to the Internet through Internet GW',
      destination: '0.0.0.0/0',
      destination_type: 'CIDR_BLOCK',
      network_entity_key: 'IGW-FRA-LZ-HUB-KEY',
    },
  },

  // --- DRG ---

  // DRG structure for firewall hubs (A, B, C). Hub E has a different DRG (spoke distribution).
  _firewall_hub_drg:: {
    'DRG-FRA-LZ-HUB-KEY': {
      display_name: 'drg-fra-lz-hub',

      drg_attachments: {
        'DRGATT-FRA-LZ-HUB-VCN-KEY': {
          display_name: 'drgatt-fra-lz-hub',
          drg_route_table_key: 'DRGRT-FRA-LZ-HUB-KEY',

          network_details: {
            type: 'VCN',
            attached_resource_key: 'VCN-FRA-LZ-HUB-KEY',
            route_table_key: 'RT-FRA-LZ-HUB-INGRESS-KEY',
          },
        },
      },

      drg_route_distributions: {
        'DRGRD-FRA-LZ-HUB-KEY': {
          display_name: 'drgrd-fra-lz-hub',
          distribution_type: 'IMPORT',
          statements: {},
        },
      },

      drg_route_tables: {
        'DRGRT-FRA-LZ-HUB-KEY': {
          display_name: 'drgrt-fra-lz-hub',
          import_drg_route_distribution_key: 'DRGRD-FRA-LZ-HUB-KEY',
          is_ecmp_enabled: false,
          route_rules: {},
        },

        'DRGRT-FRA-LZ-SPOKES-KEY': {
          display_name: 'drgrt-fra-lz-spokes',
          is_ecmp_enabled: false,

          route_rules: {
            'DRGRT-FRA-LZ-SPOKES-STATIC-ROUTE': {
              destination: '0.0.0.0/0',
              destination_type: 'CIDR_BLOCK',
              next_hop_drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
            },
          },
        },
      },
    },
  },

  // --- Security list helpers ---

  _icmp_sl(name):: {
    [std.asciiUpper(name) + '-KEY']: {
      display_name: name,
      egress_rules: [],
      ingress_rules: $._icmp_ingress_rules(ip.hub_vcn),
    },
  },

  // NATGW route rules pointing MGMT/MON/DNS traffic through a firewall entity (for hubs A, B).
  _natgw_firewall_routes(ip_config, entity_id, fw_desc='OCI Network Firewall'):: {
    'rt-vcn-fra-hub-mgmt-sn': {
      description: 'Route to mgmt subnet in Hub VCN through %s' % fw_desc,
      destination: ip_config.mgmt_sn,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_id,
    },

    'rt-vcn-fra-hub-logs-sn': {
      description: 'Route to mon subnet in Hub VCN through %s' % fw_desc,
      destination: ip_config.mon_sn,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_id,
    },

    'rt-vcn-fra-hub-dns-sn': {
      description: 'Route to dns subnet in Hub VCN through %s' % fw_desc,
      destination: ip_config.dns_sn,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_id,
    },
  },
}
