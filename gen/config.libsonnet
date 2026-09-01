// gen/config.libsonnet
// Config normalization and subnet policy selection for OCI Landing Zone.
local cidrs = import 'lib/cidrs.libsonnet';
local collections = import 'lib/collections.libsonnet';
local constants = import 'constants.libsonnet';
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
    local environments = validation.required_object(config, 'environments', 'config.environments');
    local env_names = std.objectFields(environments);
    assert std.length(std.objectFields(environments)) > 0 : 'config.environments must have at least one environment';

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

    local norm_project_network(env_name, raw_network) =
      local project_network = validation.object(
        raw_network,
        'Environment %s.project_network' % env_name
      );
      local network = validation.required_object(
        project_network,
        'network',
        'Environment %s.project_network.network' % env_name
      );
      local network_label = 'Environment %s.project_network.network' % env_name;
      local vcn = required_vcn(network, network_label);
      // Tri-state contract: omitted uses defaults, {} emits none, and a
      // non-empty map is authoritative (no implicit standard subnets).
      local shared_subnets =
        if std.objectHas(network, 'subnets') then
          local raw_subnets = validation.object(network.subnets, '%s.subnets' % network_label);
          if std.length(std.objectFields(raw_subnets)) == 0 then {}
          else subnet_utils.validate_named_subnets(
            raw_subnets,
            '%s.subnets' % network_label,
            vcn
          )
        else subnet_utils.auto_subnets_24(vcn, spoke_subnet_names);
      local routing =
        if std.objectHas(project_network, 'subnet_routing') && project_network.subnet_routing != null then project_network.subnet_routing
        else 'vcn';
      assert routing == 'vcn' || routing == 'hub' :
        'Environment %s.project_network.subnet_routing must be one of: vcn, hub' % env_name;
      assert !(routing == 'hub' && hub_kind == 'hub_e') :
        'Environment %s.project_network.subnet_routing hub is not supported with hub_e' % env_name;
      project_network {
        subnet_routing: routing,
        network+: {
          vcn: vcn,
          subnets: shared_subnets,
        },
      };

    local norm_envs = {
      [env_name]:
        local env = validation.object(environments[env_name], 'Environment %s' % env_name);
        assert !std.objectHas(env, 'shared_project_network') :
          'Environment %s.shared_project_network is not supported; use project_network' % env_name;
        local raw_project_network =
          if std.objectHas(env, 'project_network') then env.project_network
          else null;
        local normalized_project_network =
          if raw_project_network != null then norm_project_network(env_name, raw_project_network)
          else null;
        local raw_projects =
          if std.objectHas(env, 'projects') then
            validation.object(env.projects, 'Environment %s.projects' % env_name)
          else {};
        local projects_with_subnets = [
          project_name
          for project_name in std.objectFields(raw_projects)
          if std.objectHas(
            validation.object(
              raw_projects[project_name],
              'Environment %s.projects.%s' % [env_name, project_name]
            ),
            'subnets'
          )
        ];
        assert raw_project_network != null || std.length(projects_with_subnets) == 0 :
          'Environment %s.projects.%s.subnets requires project_network' % [
            env_name,
            projects_with_subnets[0],
          ];
        local normalized_projects =
          if std.objectHas(env, 'projects') then
            {
              [project_name]:
                local project = validation.object(
                  raw_projects[project_name],
                  'Environment %s.projects.%s' % [env_name, project_name]
                );
                project + if std.objectHas(project, 'subnets') then {
                  subnets: subnet_utils.validate_named_subnets(
                    project.subnets,
                    'Environment %s.projects.%s.subnets' % [env_name, project_name],
                    normalized_project_network.network.vcn
                  ),
                } else {}
              for project_name in std.objectFields(raw_projects)
            }
          else {};
        local all_project_subnets =
          if normalized_project_network == null then []
          else [
            { label: 'Environment %s shared subnet %s' % [env_name, subnet_name], cidr: normalized_project_network.network.subnets[subnet_name] }
            for subnet_name in std.objectFields(normalized_project_network.network.subnets)
          ] + std.flattenArrays([
            [
              { label: 'Environment %s project %s subnet %s' % [env_name, project_name, subnet_name], cidr: normalized_projects[project_name].subnets[subnet_name] }
              for subnet_name in std.objectFields(normalized_projects[project_name].subnets)
            ]
            for project_name in std.objectFields(normalized_projects)
            if std.objectHas(normalized_projects[project_name], 'subnets')
          ]);
        assert normalized_project_network == null || cidrs.assert_non_overlapping(
          all_project_subnets,
          'Environment %s project network subnets' % env_name
        );
        { [key]: env[key] for key in std.objectFields(env) if key != 'project_network' && key != 'projects' } {
        [if normalized_project_network != null then 'project_network']:
          normalized_project_network,

        [if std.objectHas(env, 'projects') then 'projects']: normalized_projects,

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
      (if std.objectHas(env, 'project_network') then [
        {
          label: 'Environment %s shared project network' % env_name,
          cidr: env.project_network.network.vcn,
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
      cis_level: cis_level,
      hub+: { network+: { subnets: hub_subnets } },
      environments: norm_envs,
      [if security_target_names != null then 'security_targets']: security_target_names,
      [if std.length(std.objectFields(norm_shared)) > 0 then 'shared_platforms']: norm_shared,
    },
}
