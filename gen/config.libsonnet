// gen/config.libsonnet
// Config normalization and subnet policy selection for OCI Landing Zone.
local cidrs = import 'lib/cidrs.libsonnet';
local subnet_utils = import 'lib/subnets.libsonnet';
local validation = import 'lib/validation.libsonnet';

{
  local hub_subnet_order = {
    hub_e: ['lb', 'mgmt', 'mon', 'dns'],
    hub_b: ['lb', 'fw', 'mgmt', 'mon', 'dns'],
    hub_a: ['fw-dmz', 'lb', 'fw-int', 'mgmt', 'mon', 'dns'],
    hub_c: ['untrust', 'trust', 'lb', 'mgmt', 'mon', 'dns'],
  },
  local supported_hub_kinds = std.objectFields(hub_subnet_order),

  local spoke_subnet_names = ['web', 'app', 'db', 'infra'],

  normalize(config)::
    local hub = validation.required_object(config, 'hub', 'config.hub');
    local hub_kind = validation.required(hub, 'kind', 'config.hub.kind');
    assert std.member(supported_hub_kinds, hub_kind) :
      'config.hub.kind must be one of: %s' % std.join(', ', supported_hub_kinds);
    local hub_network = validation.required_object(hub, 'network', 'config.hub.network');
    local environments = validation.required_object(config, 'environments', 'config.environments');
    local env_names = std.objectFields(environments);
    assert std.length(std.objectFields(environments)) > 0 : 'config.environments must have at least one environment';

    local security_target_names =
      if std.objectHas(config, 'security_targets') && config.security_targets != null then
        local targets = validation.array(config.security_targets, 'config.security_targets');
        assert std.all([
          std.member(env_names, env_name)
          for env_name in targets
        ]) :
          'config.security_targets must only reference defined environments: %s' % std.join(', ', [
            env_name
            for env_name in targets
            if !std.member(env_names, env_name)
          ]);
        targets
      else null;

    local has_region = std.objectHas(config, 'region') && config.region != null;
    local has_region_short_name =
      std.objectHas(config, 'region_short_name') && config.region_short_name != null;
    assert has_region == has_region_short_name :
      'config.region and config.region_short_name must either both be provided or both be omitted';
    local region =
      if has_region then config.region
      else 'eu-frankfurt-1';
    local region_short_name =
      if has_region_short_name then config.region_short_name
      else 'fra';
    local realm =
      if std.objectHas(config, 'realm') && config.realm != null then config.realm
      else 'oc1';

    local hub_subnet_keys = hub_subnet_order[hub_kind];
    local hub_subnet_label = 'config.hub.network.subnets for %s' % hub_kind;
    local hub_vcn = cidrs.validate(
      'config.hub.network.vcn',
      validation.required(hub_network, 'vcn', 'config.hub.network.vcn')
    );
    local hub_subnets =
      if std.objectHas(hub_network, 'subnets') then
        subnet_utils.validate_subnet_map(hub_network.subnets, hub_subnet_keys, hub_subnet_label, hub_vcn)
      else subnet_utils.auto_subnets_24(hub_vcn, hub_subnet_keys);

    local norm_platform(plat, p_name) =
      local extension =
        if std.objectHas(plat, 'extension') then
          local ext = validation.required_object(
            plat,
            'extension',
            'Platform %s.extension' % p_name
          );
          ext {
            type: validation.required(ext, 'type', 'Platform %s.extension.type' % p_name),
            params: validation.required_object(
              ext,
              'params',
              'Platform %s.extension.params' % p_name
            ),
          }
        else null;
      local has_network = std.objectHas(plat, 'network') && plat.network != null;
      assert has_network || extension != null : 'Platform %s.network is required' % p_name;
      local normalized_network =
        if has_network then
          local network = validation.object(plat.network, 'Platform %s.network' % p_name);
          local platform_vcn = cidrs.validate(
            'Platform %s.network.vcn' % p_name,
            validation.required(network, 'vcn', 'Platform %s.network.vcn' % p_name)
          );
          {
            network: network {
              vcn: platform_vcn,
              subnets:
                if std.objectHas(network, 'subnets') then
                  if extension != null then network.subnets
                  else subnet_utils.validate_named_subnets(
                    network.subnets,
                    'Platform %s.network.subnets' % p_name,
                    platform_vcn
                  )
                else if extension != null then null
                else error 'Platform %s requires explicit subnets (no extension to auto-compute from)' % p_name,
            },
          }
        else {};
      plat
      + (if extension != null then { extension: extension } else {})
      + normalized_network;

    local norm_spn(env_name, env) =
      local spn = validation.required_object(
        env,
        'shared_project_network',
        'Environment %s.shared_project_network' % env_name
      );
      local network = validation.required_object(
        spn,
        'network',
        'Environment %s.shared_project_network.network' % env_name
      );
      local spn_vcn = cidrs.validate(
        'Environment %s.shared_project_network.network.vcn' % env_name,
        validation.required(
          network,
          'vcn',
          'Environment %s.shared_project_network.network.vcn' % env_name
        )
      );
      spn {
        network+: {
          vcn: spn_vcn,
          subnets:
            if std.objectHas(network, 'subnets') then
              subnet_utils.validate_named_subnets(
                network.subnets,
                'Environment %s.shared_project_network.network.subnets' % env_name,
                spn_vcn
              )
            else subnet_utils.auto_subnets_24(spn_vcn, spoke_subnet_names),
        },
      };

    local norm_envs = {
      [env_name]: local env = environments[env_name]; env {
        [if std.objectHas(env, 'shared_project_network') then 'shared_project_network']:
          norm_spn(env_name, env),

        [if std.objectHas(env, 'platforms') then 'platforms']: {
          [p_name]: norm_platform(env.platforms[p_name], p_name)
          for p_name in std.objectFields(env.platforms)
        },
      }
      for env_name in std.objectFields(environments)
    };

    local norm_shared = if std.objectHas(config, 'shared_platforms') then {
      [p_name]: norm_platform(config.shared_platforms[p_name], p_name)
      for p_name in std.objectFields(config.shared_platforms)
    } else {};

    local env_vcn_entries = std.flattenArrays([
      local env = norm_envs[env_name];
      (if std.objectHas(env, 'shared_project_network') then [
        {
          label: 'Environment %s shared project network' % env_name,
          cidr: env.shared_project_network.network.vcn,
        },
      ] else [])
      + (if std.objectHas(env, 'platforms') then [
           {
             label: 'Platform %s/%s' % [env_name, p_name],
             cidr: env.platforms[p_name].network.vcn,
           }
           for p_name in std.objectFields(env.platforms)
           if std.objectHas(env.platforms[p_name], 'network') && env.platforms[p_name].network != null
         ] else [])
      for env_name in std.objectFields(norm_envs)
    ]);
    local shared_vcn_entries = [
      {
        label: 'Shared platform %s' % p_name,
        cidr: norm_shared[p_name].network.vcn,
      }
      for p_name in std.objectFields(norm_shared)
      if std.objectHas(norm_shared[p_name], 'network') && norm_shared[p_name].network != null
    ];
    assert cidrs.assert_non_overlapping(
      [{ label: 'Hub VCN', cidr: hub_vcn }] + env_vcn_entries + shared_vcn_entries,
      'VCN CIDRs'
    );

    config {
      region: region,
      region_short_name: region_short_name,
      realm: realm,
      hub+: { network+: { subnets: hub_subnets } },
      environments: norm_envs,
      [if security_target_names != null then 'security_targets']: security_target_names,
      [if std.length(std.objectFields(norm_shared)) > 0 then 'shared_platforms']: norm_shared,
    },
}
