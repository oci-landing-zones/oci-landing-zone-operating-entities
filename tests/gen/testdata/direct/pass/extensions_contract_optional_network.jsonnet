// optional-network extensions accept both networked and identity-only platform entries
// contains: "identity_only_network_is_null": true
// contains: "networked_subnets": ["db", "backup"]
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';

local registry = {
  optional: {
    metadata(params):: {
      network_mode: 'optional',
      default_subnets: {
        db: '/24',
        backup: '/24',
      },
      subnet_order: ['db', 'backup'],
    },
    render(params):: {
      [if params.network != null then 'network_pre']: {},
      [params.topology.platform_name]: {
        network_is_null: params.network == null,
        subnet_keys:
          if params.network == null then []
          else [
            sn
            for sn in ['db', 'backup']
            if std.objectHas(params.network.subnets, sn)
          ],
      },
    },
  },
};

local entry(name, network=null) = {
  scope: {
    scope_name: 'shared',
    scope_title: 'Shared',
    scope_type: 'shared',
    platform_name: name,
  },
  platform_config: {
    [if network != null then 'network']: network,
    extension: { type: 'optional', params: {} },
  },
};

local state = extensions.resolve({
  extension_registry: registry,
  extension_entries: [
    entry('identity'),
    entry('networked', { vcn: '10.0.24.0/21', subnets: null }),
  ],
  naming: naming('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
});

local networked_subnets_json =
  '[' + std.join(', ', [
    std.manifestJson(sn)
    for sn in state.extra.networked.subnet_keys
  ]) + ']';

'{\n' +
'  "identity_only_network_is_null": %s,\n' % (
  if state.extra.identity.network_is_null == true then 'true' else 'false'
) +
'  "networked_subnets": %s\n' % networked_subnets_json +
'}'
