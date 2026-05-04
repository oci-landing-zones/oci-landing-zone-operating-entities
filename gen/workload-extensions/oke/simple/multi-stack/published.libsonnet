local cfg_lib = import '../../../../config.libsonnet';
local extensions = import '../../../../extensions.libsonnet';
local naming = import '../../../../naming.libsonnet';
local platforms = import '../../../../platforms.libsonnet';
local topology = import '../../../../topology.libsonnet';
local oke_builder = import '../oke_builder.libsonnet';

{
  render(config, env_name='prod', platform_name='oke')::
    local normalized = cfg_lib.normalize(config);
    local n = naming(normalized.region_short_name);
    local topo = topology(normalized, n);
    local platform_state = platforms.collect_entries(normalized, topo);
    local routed_vcn_state =
      platforms.build_routed_vcn_entries(normalized, platform_state.all_platform_entries, topo, n);
    local platform = normalized.environments[env_name].platforms[platform_name];
    local platform_entry = {
      scope: topo.env_platform(env_name, platform_name),
      platform_config: platform,
    };
    local resolved = extensions.resolve_entry({
      cfg_lib: cfg_lib,
      extension_registry: { oke_simple: oke_builder },
      platform_entry: platform_entry,
      naming: n,
      hub_vcn_cidr: normalized.hub.network.vcn,
      routed_vcn_entries: routed_vcn_state.all_vcn_entries,
      hub_has_spoke_natgw: true,
    });

    local rendered = oke_builder.render(resolved.render_params);
    local scope = resolved.render_params.topology;
    local env = scope.scope_name;
    local plat = scope.platform_name;
    local category_key = '%s-platform-%s' % [std.asciiLower(env), std.asciiLower(plat)];
    local drg_key = n.key('DRG', ['HUB']);
    local vcn_key = n.key('VCN', [env, 'PLATFORM', plat]);
    local default_route_key = n.route_rule([n.region, 'default']);
    local oke_category =
      rendered.contributions.network_pre.network_configuration.network_configuration_categories[category_key];
    local strip_publication_local_routes(vcn) =
      vcn {
        route_tables: {
          [rt_key]: vcn.route_tables[rt_key] {
            route_rules: {
              [route_key]: vcn.route_tables[rt_key].route_rules[route_key]
              for route_key in std.objectFields(vcn.route_tables[rt_key].route_rules)
              if route_key != default_route_key
            },
          }
          for rt_key in std.objectFields(vcn.route_tables)
        },
        vcn_specific_gateways:
          if std.objectHas(vcn.vcn_specific_gateways, 'nat_gateways') then
            {
              [gateway_type]: vcn.vcn_specific_gateways[gateway_type]
              for gateway_type in std.objectFields(vcn.vcn_specific_gateways)
              if gateway_type != 'nat_gateways'
            }
          else vcn.vcn_specific_gateways,
      };
    local multi_stack_category =
      oke_category {
        vcns: {
          [key]: strip_publication_local_routes(oke_category.vcns[key])
          for key in std.objectFields(oke_category.vcns)
        },
        non_vcn_specific_gateways+: {
          inject_into_existing_drgs+: {
            [drg_key]+: {
              drg_id: drg_key,

              drg_attachments+: {
                [n.key('DRGATT', [env, 'PLATFORM', plat])]: {
                  display_name: n.display('drgatt', [env, 'platform', plat]),
                  drg_route_table_key: n.key('DRGRT', ['SPOKES']),

                  network_details: {
                    type: 'VCN',
                    attached_resource_key: vcn_key,
                  },
                },
              },
            },
          },
        },
      };

    {
      network: {
        network_configuration: {
          network_configuration_categories: {
            [category_key]: multi_stack_category,
          },
        },
      },
      identity: {
        compartments_configuration: {
          enable_delete: 'true',
          compartments: {
            [scope.compartment_key]: {
              name: scope.compartment_name,
              description: scope.compartment_description,
              parent_id: scope.parent_compartment_key,
            },
          },
        },
      } + rendered.contributions.iam,
    },
}
