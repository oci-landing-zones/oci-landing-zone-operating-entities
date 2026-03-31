// oneoe_spokes.libsonnet — Spoke VCN definitions for one-oe hub variants.
//
// Returns a function that produces hidden helpers for composing spoke infrastructure.
// Called by oneoe_compose.libsonnet with hub-specific parameters.
//
// Parameters:
//   mgmt_cidr       : Hub MGMT subnet CIDR for SSH NSG rules (e.g., '10.0.1.0/24')
//   lb_cidr         : Hub LB subnet CIDR for WEB NSG ingress (e.g., '10.0.0.0/24')
//   has_spoke_natgw : true for Hub E (spokes get NAT GW + explicit routes)
//
// Exports (hidden):
//   _drg_spoke_attachments           — DRG attachments for spoke VCNs
//   _drg_hub_distribution_statements — Route distribution statements for hub DRG table
//   _drg_spoke_distribution_statements — Spoke distribution (Hub E only)
//   _hub_spoke_routes_via_drg        — Hub route rules to reach spokes via DRG
//   _nsg_fw_spoke_ingress            — FW/NLB NSG ingress rules from spoke VCNs
//   _hub_spoke_routes_via_nfw(entity_ip, entity_desc) — Post-deploy spoke routes via firewall
//   _prod_category                   — Complete prod spoke VCN category
//   _preprod_category                — Complete preprod spoke VCN category
//
// Architecture notes:
//   Each spoke VCN gets web/app/db/infra subnets, NSGs, and route tables.
//   For firewall hubs (A, B, C): spokes route 0.0.0.0/0 to DRG (hub firewall inspects).
//   For Hub E (no firewall): spokes get NAT GW + explicit routes to hub and peer spokes.
local ip = (import '../../../../gen/addons/oci-hub-models/subnetting.libsonnet');
local common = (import '../../../../gen/addons/oci-hub-models/hub_common.libsonnet');

function(mgmt_cidr, lb_cidr, has_spoke_natgw=false) {

  // Spoke definitions — add new spokes here; all hub-facing helpers are generated from this list.
  local spokes = [
    { name: 'shared-exacs', display: 'Shared-EXACS', resource_name: 'shared-exacs', vcn: ip['shared-exacs_vcn'], priority: 10 },
  ],

  // -- DRG Spoke Attachments (identical across all variants) --
  _drg_spoke_attachments:: {
    ['DRGATT-FRA-LZ-%s-PROJ-KEY' % std.asciiUpper(s.name)]: {
      display_name: 'drgatt-fra-lz-%s-proj' % s.name,
      drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',

      network_details: {
        attached_resource_key: 'VCN-FRA-LZ-%s-KEY' % std.asciiUpper(s.name),
        type: 'VCN',
      },
    }
    for s in spokes
  },

  // -- DRG Distribution Statements for hub distribution (DRGRD-FRA-LZ-HUB-KEY) --
  _drg_hub_distribution_statements:: {
    ['ROUTE-TO-VCN-%s-KEY' % std.asciiUpper(s.name)]: {
      priority: s.priority,
      action: 'ACCEPT',

      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: 'DRGATT-FRA-LZ-%s-KEY' % std.asciiUpper(s.name),
      },
    }
    for s in spokes
  },

  // -- DRG Spoke Distribution Statements (Hub E only, for DRGRD-FRA-LZ-SPOKE-KEY) --
  _drg_spoke_distribution_statements:: {
    ['ROUTE-TO-VCN-%s-KEY' % std.asciiUpper(s.name)]: {
      priority: s.priority + 10,
      action: 'ACCEPT',

      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: 'DRGATT-FRA-LZ-%s-KEY' % std.asciiUpper(s.name),
      },
    }
    for s in spokes
  },

  // -- Hub route rules for spoke routing via DRG --
  _hub_spoke_routes_via_drg:: {
    ['rt-fra-%s-projects' % s.name]: {
      description: 'Route to VCN %s Projects through DRG' % s.display,
      destination: s.vcn,
      destination_type: 'CIDR_BLOCK',
      network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
    }
    for s in spokes
  },

  // -- Hub FW/NLB NSG ingress rules from spokes (Hub A, B, C only) --
  local spoke_nsg_ingress(env, cidr, display) = {
    ['from_%s_http' % env]: {
      description: 'Allow inbound traffic from %s VCN over HTTP' % display,
      src: cidr,
      src_type: 'CIDR_BLOCK',
      dst_port_max: 80,
      dst_port_min: 80,
      protocol: 'TCP',
      stateless: false,
    },
    ['from_%s_https' % env]: {
      description: 'Allow inbound traffic from %s VCN over HTTPS' % display,
      src: cidr,
      src_type: 'CIDR_BLOCK',
      dst_port_max: 443,
      dst_port_min: 443,
      protocol: 'TCP',
      stateless: false,
    },
    ['from_%s_icmp' % env]: {
      description: 'Allow ICMP type 8 (Echo) from %s VCN' % display,
      src: cidr,
      src_type: 'CIDR_BLOCK',
      protocol: 'ICMP',
      icmp_type: 8,
      icmp_code: 0,
      stateless: false,
    },
  },

  _nsg_fw_spoke_ingress:: std.foldl(
    function(acc, s) acc + spoke_nsg_ingress(s.name, s.vcn, s.display),
    spokes, {}
  ),

  // -- Post-deployment spoke route rules through firewall --
  _hub_spoke_routes_via_nfw(entity_ip, entity_desc='OCI Network Firewall'):: {
    ['rt-fra-%s-projects' % s.name]: {
      description: 'Route to VCN %s Projects through %s' % [s.display, entity_desc],
      destination: s.vcn,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: entity_ip,
    }
    for s in spokes
  },

  // Spoke VCN category generator.
  // direct_spoke_peers: Direct spoke-to-spoke DRG routes (Hub E only, no firewall).
  //   Empty for Hub A/B/C where cross-spoke traffic goes through the firewall.
  //   Format: [{ name: 'Preprod', vcn: '<cidr>' }]
  local spoke_category(name, resource_name, direct_spoke_peers=[]) =
    local key = std.asciiUpper(resource_name);
    local key_hyphen = std.asciiUpper(resource_name);
    local dns =
      if name == 'prod' then 'p'
      else if name == 'preprod' then 'pp'
      else if name == 'shared-exacs' then 'sexacs'
      else 'pp';
    local has_natgw = std.length(direct_spoke_peers) > 0;
    local vcn_cidr = ip[name + '_vcn'];
    local category_compartment_id =
      if std.findSubstr('shared', name) != []
      then 'CMP-LZ-NETWORK-KEY'
      else 'CMP-LZ-%s-NETWORK-KEY' % key;
    local rt_key = 'RT-FRA-LZ-%s-PROJ-GENERIC-KEY' % key;
    local sl_key = 'SL-FRA-LZ-%s-PROJ-GENERIC-KEY' % key;
    local web_nsg_key = 'NSG-FRA-LZ-%s-PROJ1-WEB-KEY' % key;
    local app_nsg_key = 'NSG-FRA-LZ-%s-APP-KEY' % key;
    local sn(suffix, cidr) =
      {
        ['SN-FRA-LZ-%s-%s-KEY' % [key, std.asciiUpper(suffix)]]: {
          display_name: 'sn-fra-lz-%s-%s' % [resource_name, suffix],
          cidr_block: cidr,
          dns_label: 'snfralz%s%s' % [dns, suffix],
          dhcp_options_key: 'default_dhcp_options',
          prohibit_internet_ingress: true,
          prohibit_public_ip_on_vnic: true,
          route_table_key: rt_key,
          security_list_keys: [sl_key],
        },
      };
    {
      category_compartment_id: category_compartment_id,

      vcns: {
        ['VCN-FRA-LZ-%s-KEY' % key_hyphen]: {
          display_name: 'vcn-fra-lz-%s' % resource_name,
          cidr_blocks: [vcn_cidr],
          dns_label: 'vcnfralz%s' % dns,
          block_nat_traffic: false,
          is_attach_drg: false,
          is_create_igw: false,
          is_ipv6enabled: false,
          is_oracle_gua_allocation_enabled: false,

          default_security_list: {
            egress_rules: [],
            ingress_rules: [],
          },

          network_security_groups: {
            ['NSG-FRA-LZ-%s-APP-KEY' % key]: {
              compartment_id: 'CMP-LZ-%s-KEY' % key,
              display_name: 'nsg-fra-lz-%s-db' % resource_name,
              egress_rules: common._nsg_egress_tcp_only,

              ingress_rules: {
                http_80: {
                  description: 'Allow inbound traffic from Hub LB subnet over HTTP',
                  src: lb_cidr,
                  src_type: 'CIDR_BLOCK',
                  dst_port_max: 80,
                  dst_port_min: 80,
                  protocol: 'TCP',
                  stateless: false,
                },

                https_443: {
                  description: 'Allow inbound traffic from Hub LB subnet over over HTTPS',
                  src: lb_cidr,
                  src_type: 'CIDR_BLOCK',
                  dst_port_max: 443,
                  dst_port_min: 443,
                  protocol: 'TCP',
                  stateless: false,
                },

                ssh_22: {
                  description: 'Allow inbound traffic from Hub management subnet over SSH',
                  src: mgmt_cidr,
                  src_type: 'CIDR_BLOCK',
                  dst_port_max: 22,
                  dst_port_min: 22,
                  protocol: 'TCP',
                  stateless: false,
                },
              },
            },

            ['NSG-FRA-LZ-%s-DB-KEY' % key]: {
              compartment_id: 'CMP-LZ-%s-KEY' % key,
              display_name: 'nsg-fra-lz-%s-db' % resource_name,
              egress_rules: common._nsg_egress_tcp_only,

              ingress_rules: {
                db_1521: {
                  description: 'Allow inbound from NSG nsg-fra-lz-%s-db over TCP 1521' % name,
                  src: app_nsg_key,
                  src_type: 'NETWORK_SECURITY_GROUP',
                  dst_port_max: 1521,
                  dst_port_min: 1521,
                  protocol: 'TCP',
                  stateless: false,
                },
              },
            },
          },

          route_tables: {
            [rt_key]: {
              display_name: 'nsg-fra-lz-%s-db' % resource_name,

              route_rules: {
                  sgw_route: {
                    description: 'Route to Oracle Services Network through Service GW',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-%s-KEY' % key,
                  },
                } + if has_natgw then {
                  'rt-fra-lz-hub': {
                    description: 'Route to the Hub VCN through DRG',
                    destination: ip.hub_vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },

                  'rt-natgw': {
                    description: 'Route to the Internet through NAT GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-%s-KEY' % key,
                  },
                } + { ['rt-fra-%s' % std.asciiLower(p.name)]: {
                    description: 'Route to the VCN %s Projects through DRG' % p.name,
                    destination: p.vcn,
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  } for p in direct_spoke_peers }
                else {
                  drg_route: {
                    description: 'Route to the 0.0.0.0/0 through DRG',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
                  },
                  natgw_route: {
                    description: 'Route to the Internet through NAT GW',
                    destination: '0.0.0.0/0',
                    destination_type: 'CIDR_BLOCK',
                    network_entity_key: 'NGW-FRA-LZ-SHARED-EXACS-KEY',
                  },
                },
            },
          },

          security_lists: {
            [sl_key]: {
              display_name: 'rt-fra-lz-%s-exacs-generic' % resource_name,

              egress_rules: [
                {
                  description: 'Allow all outbound traffic to 0.0.0.0/0 over ALL protocols',
                  dst: '0.0.0.0/0',
                  dst_type: 'CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
                {
                  description: 'Allow outbound traffic to Oracle Services Network over ALL protocols',
                  dst: 'all-services',
                  dst_type: 'SERVICE_CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
              ],

              ingress_rules: common._icmp_ingress_rules(vcn_cidr, management_cidr=ip.hub_vcn),
            },
          },

          subnets:
            sn('db', ip[name + '_db_sn'])
            + sn('bck', ip[name + '_db_bck_sn']),

          vcn_specific_gateways: {
              service_gateways: {
                ['SGW-FRA-LZ-%s-EXACS-KEY' % key]: {
              display_name: 'sl-fra-lz-%s-exacs-generic' % resource_name,
                  services: 'all-services',
                },
              },
            } + if has_natgw then {
              nat_gateways: {
                ['NGW-FRA-LZ-%s-EXACS-KEY' % key]: {
                  display_name: 'sgw-fra-lz-%s' % resource_name,
                },
              },
            } else {},
        },
      },
    },

  // For each spoke, its peers are all other spokes
  local peers_for(s) = [
    { name: other.display, vcn: other.vcn }
    for other in spokes
    if other.name != s.name
  ],

  _exacs_category:: spoke_category('shared-exacs', 'shared-exacs',
    if has_spoke_natgw then peers_for(spokes[0]) else []),
}
