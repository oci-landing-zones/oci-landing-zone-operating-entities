// extension render(params) must return an object
// error_contains: Extension "bad_render" render(params) must return an object
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';

extensions.resolve({
  extension_registry: {
    bad_render: {
      metadata(params):: { network_mode: 'forbidden' },
      render(params):: null,
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
      extension: { type: 'bad_render', params: {} },
    },
  }],
  naming: naming('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
})
