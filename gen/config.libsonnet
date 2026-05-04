// gen/config.libsonnet
// Config normalization and subnet policy selection for OCI Landing Zone.
local cidrs = import 'lib/cidrs.libsonnet';
local subnet_utils = import 'lib/subnets.libsonnet';

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
    assert std.objectHas(config, 'hub') : 'config.hub is required';
    assert std.objectHas(config.hub, 'kind') : 'config.hub.kind is required';
    assert std.member(supported_hub_kinds, config.hub.kind) :
      'config.hub.kind must be one of: %s' % std.join(', ', supported_hub_kinds);
    assert std.objectHas(config.hub, 'network') : 'config.hub.network is required';
    assert std.objectHas(config.hub.network, 'vcn') : 'config.hub.network.vcn is required';
    assert std.objectHas(config, 'environments') : 'config.environments is required';
    assert std.length(std.objectFields(config.environments)) > 0 : 'config.environments must have at least one environment';

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

    local hub_subnet_keys = hub_subnet_order[config.hub.kind];
    local hub_subnet_label = 'config.hub.network.subnets for %s' % config.hub.kind;
    local hub_vcn = cidrs.validate('config.hub.network.vcn', config.hub.network.vcn);
    local hub_subnets =
      if std.objectHas(config.hub.network, 'subnets') then
        subnet_utils.validate_subnet_map(config.hub.network.subnets, hub_subnet_keys, hub_subnet_label, hub_vcn)
      else subnet_utils.auto_subnets_24(hub_vcn, hub_subnet_keys);

    local norm_platform(plat, p_name) =
      assert std.objectHas(plat, 'network') : 'Platform %s.network is required' % p_name;
      assert std.objectHas(plat.network, 'vcn') : 'Platform %s.network.vcn is required' % p_name;
      local extension =
        if std.objectHas(plat, 'extension') then
          assert plat.extension != null && std.type(plat.extension) == 'object' :
            'Platform %s.extension must be an object' % p_name;
          assert std.objectHas(plat.extension, 'type') :
            'Platform %s.extension.type is required' % p_name;
          assert std.objectHas(plat.extension, 'params') :
            'Platform %s.extension.params is required' % p_name;
          assert plat.extension.params != null && std.type(plat.extension.params) == 'object' :
            'Platform %s.extension.params must be an object' % p_name;
          plat.extension
        else null;
      local platform_vcn = cidrs.validate('Platform %s.network.vcn' % p_name, plat.network.vcn);
      plat
      + (if extension != null then { extension: extension } else {})
      + {
        network: plat.network {
          vcn: platform_vcn,
          subnets:
            if std.objectHas(plat.network, 'subnets') then
              if extension != null then plat.network.subnets
              else subnet_utils.validate_named_subnets(
                plat.network.subnets,
                'Platform %s.network.subnets' % p_name,
                platform_vcn
              )
            else if extension != null then null
            else error 'Platform %s requires explicit subnets (no extension to auto-compute from)' % p_name,
        },
      };

    local norm_spn(env_name, env) =
      local spn = env.shared_project_network;
      assert spn != null && std.type(spn) == 'object' :
        'Environment %s.shared_project_network.network is required' % env_name;
      assert std.objectHas(spn, 'network') :
        'Environment %s.shared_project_network.network is required' % env_name;
      assert std.objectHas(spn.network, 'vcn') :
        'Environment %s.shared_project_network.network.vcn is required' % env_name;
      local spn_vcn = cidrs.validate(
        'Environment %s.shared_project_network.network.vcn' % env_name,
        spn.network.vcn
      );
      spn {
        network+: {
          vcn: spn_vcn,
          subnets:
            if std.objectHas(spn.network, 'subnets') then
              subnet_utils.validate_named_subnets(
                spn.network.subnets,
                'Environment %s.shared_project_network.network.subnets' % env_name,
                spn_vcn
              )
            else subnet_utils.auto_subnets_24(spn_vcn, spoke_subnet_names),
        },
      };

    local norm_envs = {
      [env_name]: local env = config.environments[env_name]; env {
        [if std.objectHas(env, 'shared_project_network') then 'shared_project_network']:
          norm_spn(env_name, env),

        [if std.objectHas(env, 'platforms') then 'platforms']: {
          [p_name]: norm_platform(env.platforms[p_name], p_name)
          for p_name in std.objectFields(env.platforms)
        },
      }
      for env_name in std.objectFields(config.environments)
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
         ] else [])
      for env_name in std.objectFields(norm_envs)
    ]);
    local shared_vcn_entries = [
      {
        label: 'Shared platform %s' % p_name,
        cidr: norm_shared[p_name].network.vcn,
      }
      for p_name in std.objectFields(norm_shared)
    ];
    local validated_vcns = cidrs.assert_non_overlapping(
      [{ label: 'Hub VCN', cidr: hub_vcn }] + env_vcn_entries + shared_vcn_entries,
      'VCN CIDRs'
    );

    assert std.length(validated_vcns) > 0 : 'VCN CIDR validation failed';
    config {
      region: region,
      region_short_name: region_short_name,
      realm: realm,
      hub+: { network+: { subnets: hub_subnets } },
      environments: norm_envs,
      [if std.length(std.objectFields(norm_shared)) > 0 then 'shared_platforms']: norm_shared,
    },
}
