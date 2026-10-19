// Networkless extension instances cannot contribute network resources.
// error_contains: Extension "networkless" render(params) cannot contribute network without a networked platform
local extensions = import 'gen/extensions.libsonnet';
extensions.resolve({
  extension_registry: {
    networkless: {
      metadata(params):: { network_mode: 'forbidden' },
      render(params):: { network: { unexpected: true } },
    },
  },
  extension_entries: [{
    scope: { scope_name: 'shared', platform_name: 'example' },
    platform_config: { extension: { type: 'networkless', params: {} } },
  }],
  naming: (import 'gen/naming.libsonnet')('fra'),
  cis_level: 1,
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
})
