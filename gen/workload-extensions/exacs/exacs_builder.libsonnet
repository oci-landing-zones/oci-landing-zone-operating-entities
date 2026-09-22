local common = import '../../hub/hub_common.libsonnet';
local descriptions = import './descriptions.libsonnet';
local exadb_render = import '../exadb/render.libsonnet';
local exadb_project_db = import '../exadb/project_db.libsonnet';
local products = import '../exadb/products.libsonnet';

{
  metadata(params)::
    local scope_config =
      if std.objectHas(params, 'scope_config') then params.scope_config
      else {};
    local inferred_components =
      if std.objectHas(scope_config, 'extension_entry_components') then
        scope_config.extension_entry_components
      else null;
    local components = exadb_project_db.normalize_components(
      products.exacs,
      params.config_params,
      inferred_components
    );
    local has_platform_network =
      std.objectHas(params, 'platform_config') &&
      std.objectHas(params.platform_config, 'network') &&
      params.platform_config.network != null;
    {
      network_mode: if has_platform_network then 'required' else 'forbidden',
    }
    + (if has_platform_network then {
      default_subnets: {
        db: '/24',
        backup: '/24',
      },
      subnet_order: ['db', 'backup'],
    } else {}),

  render(params)::
	    local n = params.naming;
	    local scope = params.topology;
	    local env = scope.qualified_name;
	    local plat = scope.platform_name;
	    local key_segments = scope.key_segments + ['PLATFORM', plat];
	    local display_segments = scope.name_segments + [plat];
	    local dns_segments = scope.dns_segments;
	    local dns_platform_suffix =
	      if std.length(dns_segments) > 1 then 'xc' else plat;
    local routing =
      if std.objectHas(params, 'routing') then params.routing
      else null;
    local has_hub = routing != null && std.objectHas(routing, 'hub') && routing.hub != null;
    local internet_default_target =
      if routing != null && std.objectHas(routing, 'internet_default_target') then
        routing.internet_default_target
      else 'local_natgw';
    local use_local_natgw = internet_default_target == 'local_natgw';
    local peer_routes =
      if routing != null && std.objectHas(routing, 'peers') then routing.peers
      else {};
	    local category_key = '%s-platform-%s' % [std.asciiLower(scope.qualified_name), std.asciiLower(plat)];
	    local vcn_key = n.key('VCN', key_segments);
	    local ngw_key = n.key('NGW', key_segments);
	    local sgw_key = n.key('SGW', key_segments);
	    local drg_key = n.key('DRG', ['HUB']);
	    local rt_key = n.key('RT', key_segments + ['GENERIC']);
	    local sl_key = n.key('SL', key_segments + ['GENERIC']);
    local route_rules =
      {
        [n.route_rule([n.region, 'sgw'])]: {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: sgw_key,
        },
      }
      + (if has_hub && use_local_natgw then {
        [routing.hub.route_key]: {
          description: routing.hub.description,
          destination: routing.hub.destination,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: drg_key,
        },
        [n.route_rule([n.region, 'natgw'])]: {
          description: 'Route to the Internet through NAT GW',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: ngw_key,
        },
      } + {
        [route_key]: {
          description: peer_routes[route_key].description,
          destination: peer_routes[route_key].destination,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: drg_key,
        }
        for route_key in std.objectFields(peer_routes)
      } else if has_hub then {
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
	          display_name: n.display('vcn', display_segments),
	          cidr_blocks: [params.network.vcn],
	          dns_label: n.dns_label(['vcn', n.region, 'lz'] + dns_segments + [dns_platform_suffix]),
          block_nat_traffic: false,
          is_attach_drg: false,
          is_create_igw: false,
          is_ipv6enabled: false,
          is_oracle_gua_allocation_enabled: false,
          default_security_list: { egress_rules: [], ingress_rules: [] },
          network_security_groups: {},
          route_tables: {
            [rt_key]: {
              display_name: n.display('rt', display_segments + ['generic']),
              route_rules: route_rules,
            },
          },
          security_lists: {
            [sl_key]: {
              display_name: n.display('sl', display_segments + ['generic']),
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
	            [n.key('SN', key_segments + ['DB'])]: {
	              display_name: n.display('sn', display_segments + ['db']),
	              cidr_block: params.network.subnets.db,
	              dns_label: n.dns_label(['sn', n.region] + dns_segments + [dns_platform_suffix, 'db']),
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            },
	            [n.key('SN', key_segments + ['BACKUP'])]: {
	              display_name: n.display('sn', display_segments + ['backup']),
	              cidr_block: params.network.subnets.backup,
	              dns_label: n.dns_label(['sn', n.region] + dns_segments + [dns_platform_suffix, 'bck']),
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            },
          },
          vcn_specific_gateways: {
            [if has_hub && use_local_natgw then 'nat_gateways']: {
              [ngw_key]: {
                display_name: n.display('ngw', display_segments),
                block_traffic: false,
              },
            },
            service_gateways: {
              [sgw_key]: {
                display_name: n.display('sgw', display_segments),
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
