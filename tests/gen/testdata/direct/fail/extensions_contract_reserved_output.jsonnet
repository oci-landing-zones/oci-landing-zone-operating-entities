// Extra extension outputs cannot replace a core deployment file.
// error_contains: Extension output "observability_cis1_pre.json" is reserved for core configuration
local extensions = import 'gen/extensions.libsonnet';
extensions.resolve({
  extension_registry: {
    networkless: {
      metadata(params):: { network_mode: 'forbidden' },
      render(params):: {},
      aggregate(results):: { observability_cis1_pre: {} },
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
