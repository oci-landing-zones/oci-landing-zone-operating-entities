local extensions = import '../../../../extensions.libsonnet';
local lz = import '../../../../landing_zone.libsonnet';
local publication_network = import '../../../../lib/publication_network.libsonnet';
local render_context = import '../../../../render_context.libsonnet';
local oke_builder = import '../oke_builder.libsonnet';
local public_lb = import '../oke_public_load_balancer.libsonnet';

function(profile, env_name='prod', platform_name='oke') {
  local cis1_config = profile.cis1_config,
  local iam_cis2_config = profile.iam_cis2_config,
  local ctx = render_context.from_raw_config(cis1_config),
  local n = ctx.n,
  local platform_entry = ctx.env_platform_entry(env_name, platform_name),
  local resolved = extensions.resolve_entry(
    ctx.extension_resolve_entry_inputs({ oke_simple: oke_builder }, platform_entry)
  ),
  local rendered_extension = oke_builder.render(resolved.render_params),
  local aggregated = oke_builder.aggregate([{
    render_params: resolved.render_params,
    metadata: resolved.metadata,
  }]),
  local iam_ctx = render_context.from_raw_config(iam_cis2_config),
  local iam_platform_entry = iam_ctx.env_platform_entry(env_name, platform_name),
  local iam_resolved = extensions.resolve_entry(
    iam_ctx.extension_resolve_entry_inputs({ oke_simple: oke_builder }, iam_platform_entry)
  ),
  local iam_rendered_extension = oke_builder.render(iam_resolved.render_params),
  local iam_aggregated = oke_builder.aggregate([{
    render_params: iam_resolved.render_params,
    metadata: iam_resolved.metadata,
  }]),
  local aggregated_iam = {
    policies_configuration+: iam_aggregated.iam.policies_configuration,
  },
    local rendered_lz = lz(cis1_config),
	  local scope = resolved.render_params.topology,
	  local iam_scope = iam_resolved.render_params.topology,
	  local env = scope.qualified_name,
	  local plat = scope.platform_name,
	  local category_key = publication_network.category_key(scope),
	  local drg_key = n.key('DRG', ['HUB']),
	  local route_segments = scope.key_segments + ['PLATFORM', plat],
	  local vcn_key = n.key('VCN', route_segments),
  local oke_category =
    rendered_extension.contributions.network_pre.network_configuration.network_configuration_categories[category_key],
  local frontend_nsg =
    if public_lb.public_load_balancer_enabled(resolved.render_params.platform_config) then
      rendered_extension.contributions.network_pre.network_configuration
        .network_configuration_categories['0-shared']
        .vcns[n.key('VCN', ['HUB'])]
        .network_security_groups
    else {},
  local multi_stack_category =
    publication_network.network_category(oke_category, n) {
      inject_into_existing_vcns+:
        if std.length(std.objectFields(frontend_nsg)) == 0 then {}
        else {
          [n.key('VCN', ['HUB'])]: {
            // Orchestrator v2.1.1 pins networking v0.8.2, whose
            // inject_into_existing_vcns contract resolves this key through
            // network_dependency and creates the supplied NSGs and rules.
            vcn_id: n.key('VCN', ['HUB']),
            network_security_groups: frontend_nsg,
          },
        },
      non_vcn_specific_gateways+: {
        inject_into_existing_drgs+: {
          [drg_key]+: {
            drg_id: drg_key,

            drg_attachments+: {
	              [n.key('DRGATT', route_segments)]: {
	                display_name: n.display('drgatt', scope.name_segments + [plat]),
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
    },

  oke_network: {
    network_configuration: {
      network_configuration_categories: {
        [category_key]: multi_stack_category,
      },
    },
  },
  oke_identity: {
    compartments_configuration: {
      enable_delete: 'true',
      compartments: {
        [iam_scope.compartment_key]: {
          name: iam_scope.compartment_name,
          description: iam_scope.compartment_description,
          parent_id: iam_scope.parent_compartment_key,
          defined_tags: {
            [public_lb.platform_tag]: public_lb.platform_tag_value(
              iam_scope.qualified_name,
              iam_scope.platform_name
            ),
          },
        },
      },
    },
  } + iam_rendered_extension.contributions.iam + aggregated_iam,
  // Multi-stack is deployed over an existing Landing Zone, so publish only
  // the OKE platform tag namespace and not the baseline role namespace.
  oke_governance: aggregated.governance,
  oke_observability_cis1: rendered_lz.observability_cis1,
  oke_observability_cis1_pre: rendered_lz.observability_cis1_pre,
  oke_observability_cis2: rendered_lz.observability_cis2,
  oke_observability_cis2_pre: rendered_lz.observability_cis2_pre,
  oke_clusters: rendered_lz.extra.oke_clusters,
  oke_workers: rendered_lz.extra.oke_workers,
}
