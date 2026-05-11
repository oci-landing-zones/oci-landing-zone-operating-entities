local common = import '../../hub/hub_common.libsonnet';
local descriptions = import './descriptions.libsonnet';
local exadb_render = import '../exadb/render.libsonnet';
local products = import '../exadb/products.libsonnet';

{
  metadata(params):: {
    network_mode: 'optional',
    default_subnets: {
      db: '/24',
      backup: '/24',
    },
    subnet_order: ['db', 'backup'],
  },

  render(params)::
    local n = params.naming;
    local scope = params.topology;
    local env = scope.scope_name;
    local plat = scope.platform_name;
    local dns = scope.dns;
    local routing =
      if std.objectHas(params, 'routing') then params.routing
      else null;
    local has_hub = routing != null && std.objectHas(routing, 'hub') && routing.hub != null;
    local category_key = '%s-platform-%s' % [std.asciiLower(env), std.asciiLower(plat)];
    local vcn_key = n.key('VCN', [env, 'PLATFORM', plat]);
    local sgw_key = n.key('SGW', [env, 'PLATFORM', plat]);
    local drg_key = n.key('DRG', ['HUB']);
    local rt_key = n.key('RT', [env, 'PLATFORM', plat, 'GENERIC']);
    local sl_key = n.key('SL', [env, 'PLATFORM', plat, 'GENERIC']);
    local route_rules =
      {
        [n.route_rule([n.region, 'sgw'])]: {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: sgw_key,
        },
      }
      + (if has_hub then {
        [n.route_rule([n.region, 'drg'])]: {
          description: 'Route to 0.0.0.0/0 through DRG',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: drg_key,
        },
      } else {});
    local build_network_category() = {
      category_compartment_id: scope.network_compartment_key,
      vcns: {
        [vcn_key]: {
          display_name: n.display('vcn', [env, 'platform', plat]),
          cidr_blocks: [params.network.vcn],
          dns_label: n.dns_label(['vcn', n.region, 'lz', dns, plat]),
          block_nat_traffic: false,
          is_attach_drg: false,
          is_create_igw: false,
          is_ipv6enabled: false,
          is_oracle_gua_allocation_enabled: false,
          default_security_list: { egress_rules: [], ingress_rules: [] },
          network_security_groups: {},
          route_tables: {
            [rt_key]: {
              display_name: n.display('rt', [env, 'platform', plat, 'generic']),
              route_rules: route_rules,
            },
          },
          security_lists: {
            [sl_key]: {
              display_name: n.display('sl', [env, 'platform', plat, 'generic']),
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
                params.network.vcn,
                management_cidr=if has_hub then routing.hub.destination else null
              ),
            },
          },
          subnets: {
            [n.key('SN', [env, 'PLATFORM', plat, 'DB'])]: {
              display_name: n.display('sn', [env, 'platform', plat, 'db']),
              cidr_block: params.network.subnets.db,
              dns_label: n.dns_label(['sn', n.region, dns, plat, 'db']),
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            },
            [n.key('SN', [env, 'PLATFORM', plat, 'BACKUP'])]: {
              display_name: n.display('sn', [env, 'platform', plat, 'backup']),
              cidr_block: params.network.subnets.backup,
              dns_label: n.dns_label(['sn', n.region, dns, plat, 'bck']),
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            },
          },
          vcn_specific_gateways: {
            service_gateways: {
              [sgw_key]: {
                display_name: n.display('sgw', [env, 'platform', plat]),
                services: 'all-services',
              },
            },
          },
        },
      },
    };

    local base_contributions = exadb_render.contributions({
      product: products.exacs,
      descriptions: descriptions,
      params: params,
    });

    {
      contributions: base_contributions + {
        [if params.network != null then 'network_pre']: {
          network_configuration+: {
            network_configuration_categories+: {
              [category_key]: build_network_category(),
            },
          },
        },
      },
    },
}
