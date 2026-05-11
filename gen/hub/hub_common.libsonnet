// hub_common.libsonnet — Shared hub VCN building blocks for all hub models (A, B, C, E).
// All fields are hidden (::) so they don't appear in output directly.
//
// PURE FUNCTION LIBRARY — no module-level imports of config or subnetting.
// Every function accepts a naming object (n) and explicit values.
//
// Exports:
//   _icmp_ingress_rules(own_vcn_cidr, management_cidr=null) — 3-rule ICMP ingress array
//   _nsg_egress_all_protocols       — NSG egress: all protocols to 0.0.0.0/0
//   _nsg_egress_tcp_only            — NSG egress: TCP only to 0.0.0.0/0
//   _mgmt_security_list(n, hub_vcn_cidr, bastion_ip) — MGMT SL with ICMP + SSH from bastion
//   _empty_default_security_list    — Empty default SL (egress=[], ingress=[])
//   _hub_vcn(n, hub_vcn_cidr, subnets, extra_subnets={}) — Base hub VCN with common subnets
//   _internet_gateway(n, segments, route_table_key=null) — IGW (key via naming)
//   _nat_gateway(n, segments, route_table_key=null)      — NAT GW (key via naming)
//   _service_gateway(n, segments)   — Service GW (key via naming)
//   _services_route_via_sgw(n)      — Route rule to Oracle Services via SGW
//   _internet_route_via_natgw(n)    — Route rule to 0.0.0.0/0 via NAT GW
//   _internet_route_via_igw(n)      — Route rule to 0.0.0.0/0 via IGW
//   _firewall_hub_drg(n)            — DRG for firewall hubs (A, B, C)
//   _icmp_sl(n, segments, hub_vcn_cidr) — ICMP-only security list (key via naming)
//   _natgw_firewall_routes(n, subnets, entity_id, fw_desc) — NATGW routes through firewall
//
// Architecture notes:
//   Hub-specific subnets (firewall, NLB) are defined in each hub's own file.
//   Common subnets (LB, MGMT, MON, DNS) are shared via _hub_vcn.
//   See gen/AGENTS.md for composition patterns and design rationale.

{
  // --- ICMP ingress rules ---

  // Standard 3-rule ICMP ingress (type 3 code 4, type 3, type 8) used by FW/LB/MGMT security lists.
  //   n: naming object (for API consistency; not used in the rules themselves).
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

  _tcp_ingress_rule(description, src, port=null, src_type='CIDR_BLOCK', stateless=false):: {
    description: description,
    src: src,
    src_type: src_type,
    [if port != null then 'dst_port_max']: port,
    [if port != null then 'dst_port_min']: port,
    protocol: 'TCP',
    stateless: stateless,
  },

  // --- Security lists ---

  _mgmt_security_list(n, hub_vcn_cidr, bastion_ip):: {
    [n.key('SL', ['HUB', 'MGMT'])]: {
      display_name: n.display('sl', ['hub', 'mgmt']),

      egress_rules: [
        {
          description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
          dst: '0.0.0.0/0',
          dst_type: 'CIDR_BLOCK',
          protocol: 'ALL',
          stateless: false,
        },
      ],

      ingress_rules: $._icmp_ingress_rules(hub_vcn_cidr) + [
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
  // n: naming object, hub_vcn_cidr: VCN CIDR string, subnets: { lb, mgmt, mon, dns, ... }
  _hub_vcn(n, hub_vcn_cidr, subnets, extra_subnets={}):: {
    display_name: n.display('vcn', ['hub']),
    cidr_blocks: [hub_vcn_cidr],
    dns_label: n.dns_label(['vcn', n.region, 'lz', 'hub']),
    block_nat_traffic: false,
    is_attach_drg: false,
    is_create_igw: false,
    is_ipv6enabled: false,
    is_oracle_gua_allocation_enabled: false,

    subnets: extra_subnets + {
      [n.key('SN', ['HUB', 'LB'])]: {
        display_name: n.display('sn', ['hub', 'lb']),
        dns_label: n.dns_label(['sn', n.region, 'hub', 'lb']),
        cidr_block: subnets.lb,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: false,
        prohibit_public_ip_on_vnic: false,
        route_table_key: n.key('RT', ['HUB', 'LB']),
        security_list_keys: [n.key('SL', ['HUB', 'LB'])],
      },

      [n.key('SN', ['HUB', 'MGMT'])]: {
        display_name: n.display('sn', ['hub', 'mgmt']),
        dns_label: n.dns_label(['sn', n.region, 'hub', 'mgmt']),
        cidr_block: subnets.mgmt,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: n.key('RT', ['HUB', 'MGMT']),
        security_list_keys: [n.key('SL', ['HUB', 'MGMT'])],
      },

      [n.key('SN', ['HUB', 'MON'])]: {
        display_name: n.display('sn', ['hub', 'mon']),
        dns_label: n.dns_label(['sn', n.region, 'hub', 'mon']),
        cidr_block: subnets.mon,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: n.key('RT', ['HUB', 'MGMT']),
        security_list_keys: [n.key('SL', ['HUB', 'MGMT'])],
      },

      // Fixed DNS subnet bug: was 'SN-FRA-LZ-HUB-DNS' (missing -KEY), now uses n.key()
      [n.key('SN', ['HUB', 'DNS'])]: {
        display_name: n.display('sn', ['hub', 'dns']),
        dns_label: n.dns_label(['sn', n.region, 'hub', 'dns']),
        cidr_block: subnets.dns,
        dhcp_options_key: 'default_dhcp_options',
        prohibit_internet_ingress: true,
        prohibit_public_ip_on_vnic: true,
        route_table_key: n.key('RT', ['HUB', 'MGMT']),
        security_list_keys: [n.key('SL', ['HUB', 'MGMT'])],
      },
    },
  },

  // --- Gateways ---

  _internet_gateway(n, segments, route_table_key=null):: {
    [n.key('IGW', segments)]: { display_name: n.display('igw', segments) }
      + (if route_table_key != null then { route_table_key: route_table_key } else {}),
  },

  _nat_gateway(n, segments, route_table_key=null):: {
    [n.key('NGW', segments)]: { display_name: n.display('ngw', segments) }
      + (if route_table_key != null then { route_table_key: route_table_key } else {}),
  },

  _service_gateway(n, segments):: {
    [n.key('SGW', segments)]: { display_name: n.display('sgw', segments), services: 'all-services' },
  },

  // --- Route rules ---

  _services_route_via_sgw(n):: {
    [n.route_rule([n.region, 'sgw'])]: {
      description: 'Route to Oracle Services Network through Service GW',
      destination: 'all-services',
      destination_type: 'SERVICE_CIDR_BLOCK',
      network_entity_key: n.key('SGW', ['HUB']),
    },
  },

  _internet_route_via_natgw(n):: {
    [n.route_rule([n.region, 'natgw'])]: {
      description: 'Route to Internet through NAT GW',
      destination: '0.0.0.0/0',
      destination_type: 'CIDR_BLOCK',
      network_entity_key: n.key('NGW', ['HUB']),
    },
  },

  _internet_route_via_igw(n):: {
    [n.route_rule([n.region, 'igw'])]: {
      description: 'Route to the Internet through Internet GW',
      destination: '0.0.0.0/0',
      destination_type: 'CIDR_BLOCK',
      network_entity_key: n.key('IGW', ['HUB']),
    },
  },

  _route_via_key(description, destination, network_entity_key, destination_type='CIDR_BLOCK'):: {
    description: description,
    destination: destination,
    destination_type: destination_type,
    network_entity_key: network_entity_key,
  },

  _route_via_id(description, destination, network_entity_id, destination_type='CIDR_BLOCK'):: {
    description: description,
    destination: destination,
    destination_type: destination_type,
    network_entity_id: network_entity_id,
  },

  _route_table_from_descriptor(n, d):: {
    [n.key('RT', d.key_segments)]: {
      display_name: n.display('rt', d.display_segments),
      route_rules: d.route_rules,
    },
  },

  _route_tables_from_descriptors(n, descriptors):: std.foldl(
    function(acc, d) acc + $._route_table_from_descriptor(n, d),
    descriptors,
    {}
  ),

  // --- DRG ---

  // DRG structure for firewall hubs (A, B, C). Hub E has a different DRG (spoke distribution).
  _firewall_hub_drg(n):: {
    [n.key('DRG', ['HUB'])]: {
      display_name: n.display('drg', ['hub']),

      drg_attachments: {
        [n.key('DRGATT', ['HUB', 'VCN'])]: {
          display_name: n.display('drgatt', ['hub']),
          drg_route_table_key: n.key('DRGRT', ['HUB']),

          network_details: {
            type: 'VCN',
            attached_resource_key: n.key('VCN', ['HUB']),
            route_table_key: n.key('RT', ['HUB', 'INGRESS']),
          },
        },
      },

      drg_route_distributions: {
        [n.key('DRGRD', ['HUB'])]: {
          display_name: n.display('drgrd', ['hub']),
          distribution_type: 'IMPORT',
          statements: {},
        },
      },

      drg_route_tables: {
        [n.key('DRGRT', ['HUB'])]: {
          display_name: n.display('drgrt', ['hub']),
          import_drg_route_distribution_key: n.key('DRGRD', ['HUB']),
          is_ecmp_enabled: false,
          route_rules: {},
        },

        [n.key('DRGRT', ['SPOKES'])]: {
          display_name: n.display('drgrt', ['spokes']),
          is_ecmp_enabled: false,

          route_rules: {
            // Internal identifier — uses region but no -KEY suffix
            ['DRGRT-%s-LZ-SPOKES-STATIC-ROUTE' % std.asciiUpper(n.region)]: {
              destination: '0.0.0.0/0',
              destination_type: 'CIDR_BLOCK',
              next_hop_drg_attachment_key: n.key('DRGATT', ['HUB', 'VCN']),
            },
          },
        },
      },
    },
  },

  // --- Security list helpers ---

  _icmp_sl(n, segments, hub_vcn_cidr):: {
    [n.key('SL', segments)]: {
      display_name: n.display('sl', segments),
      egress_rules: [],
      ingress_rules: $._icmp_ingress_rules(hub_vcn_cidr),
    },
  },

  // --- Shared utility functions ---

  // Sample host IP: derive the subnet base address plus a host offset.
  host_ip_from_subnet(subnet_cidr, host_offset, suffix='')::
    local prefix_length = std.parseInt(std.split(subnet_cidr, '/')[1]);
    local subnet_size = std.floor(std.pow(2, 32 - prefix_length));
    local max_host_offset =
      if prefix_length <= 30
      then subnet_size - 2
      else subnet_size - 1;
    local bounded_host_offset =
      if host_offset <= max_host_offset
      then host_offset
      else max_host_offset;
    local parts = std.map(std.parseInt, std.split(std.split(subnet_cidr, '/')[0], '.'));
    local total_fourth = parts[3] + bounded_host_offset;
    local carry_third = std.floor(total_fourth / 256);
    local fourth = total_fourth % 256;
    local total_third = parts[2] + carry_third;
    local carry_second = std.floor(total_third / 256);
    local third = total_third % 256;
    local total_second = parts[1] + carry_second;
    local carry_first = std.floor(total_second / 256);
    local second = total_second % 256;
    local first = parts[0] + carry_first;
    '%d.%d.%d.%d%s' % [first, second, third, fourth, suffix],

  // Bastion IP: derive a /32 bastion IP from the management subnet CIDR.
  // Uses the subnet base address plus host offset 123.
  bastion_ip_from_mgmt(mgmt_cidr)::
    $.host_ip_from_subnet(mgmt_cidr, 123, '/32'),

  // NFW IP address: subnet base address plus host offset 10.
  nfw_ip_from_subnet(subnet_cidr)::
    $.host_ip_from_subnet(subnet_cidr, 10),

  // NATGW route rules pointing MGMT/MON/DNS traffic through a firewall entity (for hubs A, B).
  // n: naming object, subnets: { mgmt, mon, dns, ... } from normalized config
  _natgw_firewall_routes(n, subnets, entity_id, fw_desc='OCI Network Firewall'):: {
    [n.route_rule(['vcn', n.region, 'hub', 'mgmt', 'sn'])]: {
      description: 'Route to mgmt subnet in Hub VCN through %s' % fw_desc,
      destination: subnets.mgmt,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_id,
    },

    [n.route_rule(['vcn', n.region, 'hub', 'mon', 'sn'])]: {
      description: 'Route to mon subnet in Hub VCN through %s' % fw_desc,
      destination: subnets.mon,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_id,
    },

    [n.route_rule(['vcn', n.region, 'hub', 'dns', 'sn'])]: {
      description: 'Route to dns subnet in Hub VCN through %s' % fw_desc,
      destination: subnets.dns,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_id,
    },
  },
}
