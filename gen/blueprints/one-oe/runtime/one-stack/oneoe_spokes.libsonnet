// Shared spoke VCN definitions for one-oe hub variants.
// Returns hidden helpers that each one-oe variant uses to compose the full config.
//
// Parameters:
//   mgmt_cidr : Hub MGMT subnet CIDR for SSH NSG rules (e.g., '10.0.1.0/24')
//   lb_cidr   : Hub LB subnet CIDR for WEB NSG ingress (e.g., '10.0.0.0/24')
//   has_spoke_natgw : true for Hub E (spokes get NAT GW + explicit routes)
local ip = (import '../../../../addons/oci-hub-models/subnetting.libsonnet');

function(mgmt_cidr, lb_cidr, has_spoke_natgw=false) {

  // -- DRG Spoke Attachments (identical across all variants) --
  _drg_spoke_attachments:: {
    'DRGATT-FRA-LZ-PROD-PROJ-KEY': {
      display_name: 'drgatt-fra-lz-prod-proj',
      drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',

      network_details: {
        attached_resource_key: 'VCN-FRA-LZ-PROD-PROJECTS-KEY',
        type: 'VCN',
      },
    },

    'DRGATT-FRA-LZ-PREPROD-PROJ-KEY': {
      display_name: 'drgatt-fra-lz-preprod-proj',
      drg_route_table_key: 'DRGRT-FRA-LZ-SPOKES-KEY',

      network_details: {
        attached_resource_key: 'VCN-FRA-LZ-PREPROD-PROJECTS-KEY',
        type: 'VCN',
      },
    },
  },

  // -- DRG Distribution Statements for hub distribution (DRGRD-FRA-LZ-HUB-KEY) --
  _drg_hub_dist_stmts:: {
    'ROUTE-TO-VCN-PROD-KEY': {
      priority: 10,
      action: 'ACCEPT',

      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PROJ-KEY',
      },
    },

    'ROUTE-TO-VCN-PREPROD-KEY': {
      priority: 20,
      action: 'ACCEPT',

      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: 'DRGATT-FRA-LZ-PREPROD-PROJ-KEY',
      },
    },
  },

  // -- DRG Spoke Distribution Statements (Hub E only, for DRGRD-FRA-LZ-SPOKE-KEY) --
  _drg_spoke_dist_stmts:: {
    'ROUTE-TO-VCN-S-PROD-KEY': {
      priority: 20,
      action: 'ACCEPT',

      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PROJ-KEY',
      },
    },

    'ROUTE-TO-VCN-S-PREPROD-KEY': {
      priority: 30,
      action: 'ACCEPT',

      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: 'DRGATT-FRA-LZ-PREPROD-PROJ-KEY',
      },
    },
  },

  // -- Hub route rules for spoke routing via DRG --
  _hub_spoke_routes_via_drg:: {
    'rt-fra-prod-projects': {
      description: 'Route to VCN Prod Projects through DRG',
      destination: ip.prod_vcn,
      destination_type: 'CIDR_BLOCK',
      network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
    },

    'rt-fra-preprod-projects': {
      description: 'Route to VCN PreProd Projects through DRG',
      destination: ip.preprod_vcn,
      destination_type: 'CIDR_BLOCK',
      network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
    },
  },

  // -- Hub FW/NLB NSG ingress rules from spokes (Hub A, B, C only) --
  _nsg_fw_spoke_ingress:: {
    from_prod_http: {
      description: 'Allow inbound traffic from Prod VCN over HTTP',
      src: ip.prod_vcn,
      src_type: 'CIDR_BLOCK',
      dst_port_max: 80,
      dst_port_min: 80,
      protocol: 'TCP',
      stateless: false,
    },

    from_prod_https: {
      description: 'Allow inbound traffic from Prod VCN over HTTPS',
      src: ip.prod_vcn,
      src_type: 'CIDR_BLOCK',
      dst_port_max: 443,
      dst_port_min: 443,
      protocol: 'TCP',
      stateless: false,
    },

    from_prod_icmp: {
      description: 'Allow ICMP type 8 (Echo) from Prod VCN',
      src: ip.prod_vcn,
      src_type: 'CIDR_BLOCK',
      protocol: 'ICMP',
      icmp_type: 8,
      icmp_code: 0,
      stateless: false,
    },

    from_preprod_http: {
      description: 'Allow inbound traffic from PreProd VCN over HTTP',
      src: ip.preprod_vcn,
      src_type: 'CIDR_BLOCK',
      dst_port_max: 80,
      dst_port_min: 80,
      protocol: 'TCP',
      stateless: false,
    },

    from_preprod_https: {
      description: 'Allow inbound traffic from PreProd VCN over HTTPS',
      src: ip.preprod_vcn,
      src_type: 'CIDR_BLOCK',
      dst_port_max: 443,
      dst_port_min: 443,
      protocol: 'TCP',
      stateless: false,
    },

    from_preprod_icmp: {
      description: 'Allow ICMP type 8 (Echo) from PreProd VCN',
      src: ip.preprod_vcn,
      src_type: 'CIDR_BLOCK',
      protocol: 'ICMP',
      icmp_type: 8,
      icmp_code: 0,
      stateless: false,
    },
  },

  // -- Post-deployment spoke route rules through firewall --
  _hub_spoke_routes_via_nfw(nfw_ip):: {
    'rt-fra-prod-projects': {
      description: 'Route to VCN Prod Projects through OCI Network Firewall',
      destination: ip.prod_vcn,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: nfw_ip,
    },

    'rt-fra-preprod-projects': {
      description: 'Route to VCN PreProd Projects through OCI Network Firewall',
      destination: ip.preprod_vcn,
      destination_type: 'CIDR_BLOCK',
      network_entity_id: nfw_ip,
    },
  },

  // -- Shared spoke helpers --
  local nsg_egress_anywhere = {
    anywhere: {
      description: 'Allow all outbound traffic to 0.0.0.0/0 over TCP',
      dst: '0.0.0.0/0',
      dst_type: 'CIDR_BLOCK',
      protocol: 'TCP',
      stateless: false,
    },
  },

  // Spoke VCN category generator.
  // direct_spoke_peers: Direct spoke-to-spoke DRG routes (Hub E only, no firewall).
  //   Empty for Hub A/B/C where cross-spoke traffic goes through the firewall.
  //   Format: [{ name: 'PreProd', vcn: '<cidr>' }]
  local spoke_category(name, direct_spoke_peers=[]) =
    local key = std.asciiUpper(name);
    local dns = if name == 'prod' then 'p' else 'pp';
    local has_natgw = std.length(direct_spoke_peers) > 0;
    local vcn_cidr = ip[name + '_vcn'];
    local rt_key = 'RT-FRA-LZ-%s-PROJ-GENERIC-KEY' % key;
    local sl_key = 'SL-FRA-LZ-%s-PROJ-GENERIC-KEY' % key;
    local web_nsg_key = 'NSG-FRA-LZ-%s-PROJ1-WEB-KEY' % key;
    local app_nsg_key = 'NSG-FRA-LZ-%s-PROJ1-APP-KEY' % key;
    local sn(suffix, cidr) = {
      ['SN-FRA-LZ-%s-%s-KEY' % [key, std.asciiUpper(suffix)]]: {
        display_name: 'sn-fra-lz-%s-%s' % [name, suffix],
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
      category_compartment_id: 'CMP-LZ-%s-NETWORK-KEY' % key,

      vcns: {
        ['VCN-FRA-LZ-%s-PROJECTS-KEY' % key]: {
          display_name: 'vcn-fra-lz-%s-projects' % name,
          cidr_blocks: [vcn_cidr],
          dns_label: 'vcnfralz%sproj' % dns,
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
            [web_nsg_key]: {
              compartment_id: 'CMP-LZ-%s-PROJ1-KEY' % key,
              display_name: 'nsg-fra-lz-%s-proj1-web' % name,
              egress_rules: nsg_egress_anywhere,

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

            [app_nsg_key]: {
              compartment_id: 'CMP-LZ-%s-PROJ1-KEY' % key,
              display_name: 'nsg-fra-lz-%s-proj1-app' % name,
              egress_rules: nsg_egress_anywhere,

              ingress_rules: {
                http_80: {
                  description: 'Allow inbound from NSG nsg-fra-lz-%s-proj1-web over HTTP' % name,
                  src: web_nsg_key,
                  src_type: 'NETWORK_SECURITY_GROUP',
                  dst_port_max: 80,
                  dst_port_min: 80,
                  protocol: 'TCP',
                  stateless: false,
                },

                https_443: {
                  description: 'Allow inbound from NSG nsg-fra-lz-%s-proj1-web over HTTPS' % name,
                  src: web_nsg_key,
                  src_type: 'NETWORK_SECURITY_GROUP',
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

            ['NSG-FRA-LZ-%s-PROJ1-DB-KEY' % key]: {
              compartment_id: 'CMP-LZ-%s-PROJ1-KEY' % key,
              display_name: 'nsg-fra-lz-%s-proj1-db' % name,
              egress_rules: nsg_egress_anywhere,

              ingress_rules: {
                db_1521: {
                  description: 'Allow inbound from NSG nsg-fra-lz-%s-proj1-app over TCP 1521' % name,
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
              display_name: 'rt-fra-lz-%s-proj-generic' % name,

              route_rules: {
                  sgw_route: {
                    description: 'Route to Oracle Services Network through Service GW',
                    destination: 'all-services',
                    destination_type: 'SERVICE_CIDR_BLOCK',
                    network_entity_key: 'SGW-FRA-LZ-%s-PROJ-KEY' % key,
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
                    network_entity_key: 'NGW-FRA-LZ-%s-PROJ-KEY' % key,
                  },
                } + { ['rt-fra-%s-projects' % std.asciiLower(p.name)]: {
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
                },
            },
          },

          security_lists: {
            [sl_key]: {
              display_name: 'sl-fra-lz-%s-proj-generic' % name,

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
                  src: vcn_cidr,
                  src_type: 'CIDR_BLOCK',
                  protocol: 'ICMP',
                  icmp_type: 3,
                  stateless: false,
                },
                {
                  description: 'Allow inbound ICMP type 8 (Echo) from Hub VCN',
                  src: ip.hub_vcn,
                  src_type: 'CIDR_BLOCK',
                  protocol: 'ICMP',
                  icmp_type: 8,
                  icmp_code: 0,
                  stateless: false,
                },
              ],
            },
          },

          subnets:
            sn('web', ip[name + '_web_sn'])
            + sn('app', ip[name + '_app_sn'])
            + sn('db', ip[name + '_db_sn'])
            + sn('infra', ip[name + '_infra_sn']),

          vcn_specific_gateways: {
              service_gateways: {
                ['SGW-FRA-LZ-%s-PROJ-KEY' % key]: {
                  display_name: 'sgw-fra-lz-%s-proj' % name,
                  services: 'all-services',
                },
              },
            } + if has_natgw then {
              nat_gateways: {
                ['NGW-FRA-LZ-%s-PROJ-KEY' % key]: {
                  display_name: 'ngw-fra-lz-%s-proj' % name,
                },
              },
            } else {},
        },
      },
    },

  _prod_category:: spoke_category('prod',
    if has_spoke_natgw then [{ name: 'PreProd', vcn: ip.preprod_vcn }] else []),

  _preprod_category:: spoke_category('preprod',
    if has_spoke_natgw then [{ name: 'Prod', vcn: ip.prod_vcn }] else []),
}
