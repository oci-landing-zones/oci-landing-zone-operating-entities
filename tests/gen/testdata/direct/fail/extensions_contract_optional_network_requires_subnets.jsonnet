// optional-network extensions with platform.network must declare default subnet metadata
// error_contains: Extension "optional_bad" must define metadata.default_subnets when network is used
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';

extensions.resolve({
  extension_registry: {
    optional_bad: {
      metadata(params):: { network_mode: 'optional' },
      render(params):: {},
    },
  },
  extension_entries: [{
    scope: {
      scope_name: 'shared',
      scope_title: 'Shared',
      scope_type: 'shared',
      platform_name: 'bad',
    },
    platform_config: {
      network: { vcn: '10.0.24.0/21', subnets: null },
      extension: { type: 'optional_bad', params: {} },
    },
  }],
  naming: naming('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
})
