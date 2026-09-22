local common = import '../../hub/hub_common.libsonnet';

function(ctx) {
  local n = ctx.n,
  local routing = ctx.routing,
  local has_hub = routing != null && std.objectHas(routing, 'hub') && routing.hub != null,
  local drg_key = n.key('DRG', ['HUB']),
  local peer_routes =
    if routing != null && std.objectHas(routing, 'peers') then routing.peers
    else {},
  local route_rules =
    {
      [n.route_rule([n.region, 'sgw'])]: {
        description: 'Route to Oracle Services Network through Service GW',
        destination: 'all-services',
        destination_type: 'SERVICE_CIDR_BLOCK',
        network_entity_key: ctx.sgw_key,
      },
    }
    + (if has_hub then {
      [routing.hub.route_key]: {
        description: routing.hub.description,
        destination: routing.hub.destination,
        destination_type: 'CIDR_BLOCK',
        network_entity_key: drg_key,
      },
    } + {
      [route_key]: {
        description: peer_routes[route_key].description,
        destination: peer_routes[route_key].destination,
        destination_type: 'CIDR_BLOCK',
        network_entity_key: drg_key,
      }
      for route_key in std.objectFields(peer_routes)
    } else {}),
  local function_suffix(fn) = std.asciiLower(fn.suffix),
  local nsg_key(fn) = n.key('NSG', [ctx.env, 'PLATFORM', ctx.plat, fn.suffix]),
  local rt_key(fn) = n.key('RT', [ctx.env, 'PLATFORM', ctx.plat, fn.suffix]),
  network_configuration+: {
      network_configuration_categories+: {
        [ctx.category_key]: {
          category_compartment_id: ctx.network_cmp_key,
          vcns: {
            [ctx.vcn_key]: {
              display_name: n.display('vcn', ctx.display_segments),
              cidr_blocks: [ctx.params.network.vcn],
              dns_label: n.dns_label(['vcn', n.region, 'lz', ctx.dns, ctx.plat]),
              block_nat_traffic: false,
              is_attach_drg: false,
              is_create_igw: false,
              is_ipv6enabled: false,
              is_oracle_gua_allocation_enabled: false,
              default_security_list: { egress_rules: [], ingress_rules: [] },
              subnets: {
                [ctx.provisioning_subnet_key]: {
                  display_name: n.display('sn', ctx.display_segments + ['provisioning']),
                  dns_label: n.dns_label(['sn', ctx.dns, 'plat', ctx.plat, 'prov']),
                  cidr_block: ctx.params.network.subnets.provisioning,
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: true,
                  prohibit_public_ip_on_vnic: true,
                  route_table_key: ctx.provisioning_route_table_key,
                  security_list_keys: [ctx.provisioning_security_list_key],
                },
              },
              route_tables: {
                [rt_key(fn)]: {
                  display_name: n.display('rt', ctx.display_segments + [function_suffix(fn)]),
                  route_rules: route_rules,
                }
                for fn in ctx.vlan_functions
              },
              security_lists: {
                [ctx.provisioning_security_list_key]: {
                  display_name: n.display('sl', ctx.display_segments + ['provisioning']),
                  egress_rules: [
                    {
                      description: 'Allow all outbound traffic',
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
                  ingress_rules: common._icmp_ingress_rules(
                    ctx.params.network.vcn,
                    management_cidr=if has_hub then routing.hub.destination else null
                  ),
                },
              },
              network_security_groups: {
                [nsg_key(fn)]: {
                  display_name: n.display('nsg', ctx.display_segments + [function_suffix(fn)]),
                  egress_rules: {
                    all: {
                      description: 'Allow all egress for OCVS SDDC networking resources',
                      protocol: 'ALL',
                      dst: '0.0.0.0/0',
                      dst_type: 'CIDR_BLOCK',
                      stateless: false,
                    },
                  },
                  ingress_rules: {
                    vcn: {
                      description: 'Allow all ingress from the OCVS VCN CIDR',
                      protocol: 'ALL',
                      src: ctx.params.network.vcn,
                      src_type: 'CIDR_BLOCK',
                      stateless: false,
                    },
                  },
                }
                for fn in ctx.vlan_functions
              },
              vcn_specific_gateways: {
                service_gateways: {
                  [ctx.sgw_key]: {
                    display_name: n.display('sgw', ctx.display_segments),
                    services: 'all-services',
                  },
                },
              },
            },
          },
        },
      },
  },
}
