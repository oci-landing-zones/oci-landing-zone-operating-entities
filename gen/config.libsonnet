// gen/config.libsonnet
// Config normalization and subnet policy selection for OCI Landing Zone.
local cidrs = import 'lib/cidrs.libsonnet';
local collections = import 'lib/collections.libsonnet';
local constants = import 'constants.libsonnet';
local operating_entities = import 'lib/operating_entities.libsonnet';
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
  local supported_realms = std.objectFields(constants),

  local spoke_subnet_names = ['web', 'app', 'db', 'infra'],

  local required_vcn(network, label) =
    cidrs.validate(
      '%s.vcn' % label,
      validation.required(network, 'vcn', '%s.vcn' % label)
    ),

  local normalize_auto_subnet_network(network, label, subnet_names) =
    local vcn = required_vcn(network, label);
    network {
      vcn: vcn,
      subnets:
        if std.objectHas(network, 'subnets') then
          subnet_utils.validate_named_subnets(network.subnets, '%s.subnets' % label, vcn)
        else subnet_utils.auto_subnets_24(vcn, subnet_names),
    },

  normalize(config)::
    local hub = validation.required_object(config, 'hub', 'config.hub');
    local hub_kind = validation.required(hub, 'kind', 'config.hub.kind');
    assert std.member(supported_hub_kinds, hub_kind) :
      'config.hub.kind must be one of: %s' % std.join(', ', supported_hub_kinds);
    local hub_network = validation.required_object(hub, 'network', 'config.hub.network');
    local has_root_environments = std.objectHas(config, 'environments') && config.environments != null;
    local has_operating_entities =
      std.objectHas(config, 'operating_entities') && config.operating_entities != null;
    assert has_root_environments || has_operating_entities :
      'config.environments or config.operating_entities is required';
    assert !(has_root_environments && has_operating_entities) :
      'config must define either environments or operating_entities, not both';

    local raw_operating_entities =
      if has_operating_entities then operating_entities.normalize(config.operating_entities)
      else null;

    local environments =
      if has_operating_entities then {}
      else validation.required_object(config, 'environments', 'config.environments');

    local env_names =
      if has_operating_entities then
        std.foldl(
          function(acc, oe_name)
            acc + [
              env_name
              for env_name in std.objectFields(raw_operating_entities[oe_name].environments)
              if !std.member(acc, env_name)
            ],
          std.objectFields(raw_operating_entities),
          []
        )
      else std.objectFields(environments);

    assert std.length(env_names) > 0 :
      if has_operating_entities then
        'config.operating_entities must define at least one environment'
      else
        'config.environments must have at least one environment';

    local force_operating_entity_dns =
      if has_operating_entities then [
        raw_operating_entities[oe_name].dns
        for oe_name in std.objectFields(raw_operating_entities)
      ] else [];
    assert std.length(std.join('', force_operating_entity_dns)) >= 0;

    local security_target_names =
      if std.objectHas(config, 'security_targets') && config.security_targets != null then
        local targets = validation.array(config.security_targets, 'config.security_targets');
        assert collections.all([
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
    assert std.member(supported_realms, realm) :
      'config.realm must be one of: %s' % std.join(', ', supported_realms);

    local raw_cis_level =
      if std.objectHas(config, 'cis_level') && config.cis_level != null then config.cis_level
      else 2;
    assert raw_cis_level == 1 || raw_cis_level == 2 ||
           raw_cis_level == '1' || raw_cis_level == '2' :
      'config.cis_level must be 1 or 2';
    local cis_level =
      if raw_cis_level == 1 || raw_cis_level == '1' then 1
      else 2;

    local hub_subnet_keys = hub_subnet_order[hub_kind];
    local hub_subnet_label = 'config.hub.network.subnets for %s' % hub_kind;
    local hub_vcn = required_vcn(hub_network, 'config.hub.network');
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
          local network_label = 'Platform %s.network' % p_name;
          local platform_vcn = required_vcn(network, network_label);
          {
            network: network {
              vcn: platform_vcn,
              subnets:
                if std.objectHas(network, 'subnets') then
                  if extension != null then network.subnets
                  else subnet_utils.validate_named_subnets(
                    network.subnets,
                    '%s.subnets' % network_label,
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
      local network_label = 'Environment %s.shared_project_network.network' % env_name;
      spn {
        network+: normalize_auto_subnet_network(network, network_label, spoke_subnet_names),
      };

    local norm_env(env_name, env) =
      env {
        [if std.objectHas(env, 'shared_project_network') then 'shared_project_network']:
          norm_spn(env_name, env),

        [if std.objectHas(env, 'platforms') then 'platforms']: {
          [p_name]: norm_platform(env.platforms[p_name], p_name)
          for p_name in std.objectFields(env.platforms)
        },
      };

    local norm_envs = {
      [env_name]: norm_env(env_name, environments[env_name])
      for env_name in std.objectFields(environments)
    };

    local norm_operating_entities =
      if has_operating_entities then {
        [oe_name]: raw_operating_entities[oe_name] {
          environments: {
            [env_name]: norm_env(env_name, raw_operating_entities[oe_name].environments[env_name])
            for env_name in std.objectFields(raw_operating_entities[oe_name].environments)
          },
        }
        for oe_name in std.objectFields(raw_operating_entities)
      } else null;

    local norm_shared = if std.objectHas(config, 'shared_platforms') then {
      [p_name]: norm_platform(config.shared_platforms[p_name], p_name)
      for p_name in std.objectFields(config.shared_platforms)
    } else {};

    local env_vcn_entries(env, shared_label, platform_label) =
      (if std.objectHas(env, 'shared_project_network') then [
        {
          label: shared_label,
          cidr: env.shared_project_network.network.vcn,
        },
      ] else [])
      + (if std.objectHas(env, 'platforms') then [
           {
             label: platform_label(p_name),
             cidr: env.platforms[p_name].network.vcn,
           }
           for p_name in std.objectFields(env.platforms)
           if std.objectHas(env.platforms[p_name], 'network') && env.platforms[p_name].network != null
         ] else []);

    local one_oe_env_vcn_entries = std.flattenArrays([
      env_vcn_entries(
        norm_envs[env_name],
        'Environment %s shared project network' % env_name,
        function(p_name) 'Platform %s/%s' % [env_name, p_name]
      )
      for env_name in std.objectFields(norm_envs)
    ]);
    local multi_oe_env_vcn_entries =
      if has_operating_entities then std.flattenArrays([
        std.flattenArrays([
          env_vcn_entries(
            norm_operating_entities[oe_name].environments[env_name],
            'Operating entity %s environment %s shared project network' % [oe_name, env_name],
            function(p_name) 'Operating entity %s platform %s/%s' % [oe_name, env_name, p_name]
          )
          for env_name in std.objectFields(norm_operating_entities[oe_name].environments)
        ])
        for oe_name in std.objectFields(norm_operating_entities)
      ]) else [];

    local env_vcn_entries =
      if has_operating_entities then multi_oe_env_vcn_entries
      else one_oe_env_vcn_entries;
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
      cis_level: cis_level,
      hub+: { network+: { subnets: hub_subnets } },
      [if !has_operating_entities then 'environments']: norm_envs,
      [if has_operating_entities then 'operating_entities']: norm_operating_entities,
      [if security_target_names != null then 'security_targets']: security_target_names,
      [if std.length(std.objectFields(norm_shared)) > 0 then 'shared_platforms']: norm_shared,
    },
}
