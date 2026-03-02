local cfg_lib = import '../../../../config.libsonnet';
local naming = import '../../../../naming.libsonnet';
local platforms = import '../../../../platforms.libsonnet';
local topology = import '../../../../topology.libsonnet';
local oke_builder = import '../oke_builder.libsonnet';

{
  render(config, env_name='prod', platform_name='oke')::
    local normalized = cfg_lib.normalize(config);
    local n = naming(normalized.region_short_name);
    local topo = topology(normalized, n);
    local ordered_env_names = topo.ordered_env_names();
    local platform_state = platforms.collect_entries(normalized, ordered_env_names, topo);
    local routed_vcn_state =
      platforms.build_routed_vcn_entries(normalized, platform_state.all_platform_entries, topo, n);
    local platform = normalized.environments[env_name].platforms[platform_name];
    local platform_entry = {
      scope: topo.env_platform(env_name, platform_name),
      platform_config: platform,
    };

    local metadata = oke_builder.render({
      config_params: platform.extension.params,
      network: { vcn: platform.network.vcn, subnets: {} },
      naming: n,
      topology: platform_entry.scope,
      routing: null,
    }).metadata;

    local subnet_names =
      if std.objectHas(metadata, 'subnet_order') then metadata.subnet_order
      else std.objectFields(metadata.default_subnets);

    local resolved_subnets =
      if platform.network.subnets != null then platform.network.subnets
      else cfg_lib.auto_subnets(
        platform.network.vcn,
        [
          { name: sn_name, size: metadata.default_subnets[sn_name] }
          for sn_name in subnet_names
        ]
      );

    local rendered = oke_builder.render({
      config_params: platform.extension.params,
      network: { vcn: platform.network.vcn, subnets: resolved_subnets },
      naming: n,
      topology: platform_entry.scope,
      routing: platforms.build_extension_route_targets(
        platform_entry,
        routed_vcn_state.all_vcn_entries,
        n,
        normalized.hub.network.vcn
      ),
    }, 'multi_stack');

    {
      network: rendered.published.oke_network,
      identity: rendered.published.oke_identity,
    },
}
