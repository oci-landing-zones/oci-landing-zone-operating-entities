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

    local rendered = oke_builder.render(resolved.render_params, 'multi_stack');

    {
      network: rendered.published.oke_network,
      identity: rendered.published.oke_identity,
    },
}
