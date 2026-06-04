local extensions = import '../../../../extensions.libsonnet';
local platforms = import '../../../../platforms.libsonnet';
local render_context = import '../../../../render_context.libsonnet';
local oke_builder = import '../oke_builder.libsonnet';

{
  render(config, env_name='prod', platform_name='oke')::
    local ctx = render_context.from_raw_config(config);
    local n = ctx.n;
    local platform_entry = ctx.env_platform_entry(env_name, platform_name);
    local resolved = extensions.resolve_entry(
      ctx.extension_resolve_entry_inputs({ oke_simple: oke_builder }, platform_entry, config.hub.kind == 'hub_e')
    );

    local rendered = oke_builder.render(resolved.render_params);
    local scope = resolved.render_params.topology;
    local env = scope.scope_name;
    local plat = scope.platform_name;
    local category_key = platforms.publication_category_key(scope);
    local drg_key = n.key('DRG', ['HUB']);
    local vcn_key = n.key('VCN', [env, 'PLATFORM', plat]);
    local oke_category =
      rendered.contributions.network_pre.network_configuration.network_configuration_categories[category_key];
    local multi_stack_category =
      platforms.publication_network_category(oke_category, n) {
        non_vcn_specific_gateways+: {
          inject_into_existing_drgs+: {
            [drg_key]+: {
              drg_id: drg_key,

              drg_attachments+: {
                [n.key('DRGATT', [env, 'PLATFORM', plat])]: {
                  display_name: n.display('drgatt', [env, plat]),
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
