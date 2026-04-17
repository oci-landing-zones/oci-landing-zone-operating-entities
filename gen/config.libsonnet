// gen/config.libsonnet
// Config normalization and auto-subnet calculation for OCI Landing Zone.
// Handles CIDR allocation with proper alignment and config defaults.
local subnet_utils = import 'lib/subnets.libsonnet';

{
  local ip_to_int(octets) =
    octets[0] * 16777216
    + octets[1] * 65536
    + octets[2] * 256
    + octets[3],

  local int_to_octets(ip_int) = [
    std.floor(ip_int / 16777216) % 256,
    std.floor(ip_int / 65536) % 256,
    std.floor(ip_int / 256) % 256,
    ip_int % 256,
  ],

  local parse_cidr(cidr) =
    local parts = std.split(cidr, '/');
    local octets = std.map(std.parseInt, std.split(parts[0], '.'));
    {
      octets: octets,
      base_int: ip_to_int(octets),
      prefix: std.parseInt(parts[1]),
    },

  auto_subnets(vcn_cidr, subnet_defs)::
    local base = parse_cidr(vcn_cidr);
    local total_size = std.floor(std.pow(2, 32 - base.prefix));
    local vcn_limit = base.base_int + total_size;
    local allocated = std.foldl(
      function(acc, def)
        local block_size = subnet_utils.block_size_for_prefix(def.size);
        // Align to block boundary
        local raw_offset = acc.offset;
        local aligned_offset =
          if raw_offset % block_size == 0 then raw_offset
          else (std.floor(raw_offset / block_size) + 1) * block_size;
        local subnet_base = base.base_int + aligned_offset;
        assert subnet_base + block_size <= vcn_limit :
          'Subnet allocation exceeds VCN %s while allocating %s (%s)' % [vcn_cidr, def.name, def.size];
        local subnet_octets = int_to_octets(subnet_base);
        local cidr = '%d.%d.%d.%d%s' % [
          subnet_octets[0],
          subnet_octets[1],
          subnet_octets[2],
          subnet_octets[3],
          def.size,
        ];
        acc {
          offset: aligned_offset + block_size,
          result+: { [def.name]: cidr },
        },
      subnet_defs,
      { offset: 0, result: {} }
    );
    allocated.result,

  auto_subnets_24(vcn_cidr, names)::
    self.auto_subnets(vcn_cidr, [{ name: n, size: '/24' } for n in names]),

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
    local hub_subnets =
      if std.objectHas(config.hub.network, 'subnets') then
        subnet_utils.validate_subnet_map(config.hub.network.subnets, hub_subnet_keys, hub_subnet_label)
      else self.auto_subnets_24(config.hub.network.vcn, hub_subnet_keys);

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
      plat
      + (if extension != null then { extension: extension } else {})
      + {
        network: plat.network + {
          subnets:
            if std.objectHas(plat.network, 'subnets') then plat.network.subnets
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
      spn {
        network+: {
          subnets:
            if std.objectHas(spn.network, 'subnets') then spn.network.subnets
            else $.auto_subnets_24(spn.network.vcn, spoke_subnet_names),
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

    config {
      region: region,
      region_short_name: region_short_name,
      realm: realm,
      hub+: { network+: { subnets: hub_subnets } },
      environments: norm_envs,
      [if std.length(std.objectFields(norm_shared)) > 0 then 'shared_platforms']: norm_shared,
    },
}
