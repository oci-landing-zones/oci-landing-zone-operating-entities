// networked extensions must reject platform entries that omit network.vcn
// error_contains: Extension "needs_network" for platform shared/oke requires network.vcn
local extensions = import 'gen/extensions.libsonnet';

extensions.resolve({
  extension_registry: {
    needs_network: {
      metadata(params):: {
        default_subnets: { workers: '/24' },
      },
      render(params):: {
        network_pre: {},
      },
    },
  },
  extension_entries: [
    {
      scope: {
        scope_name: 'shared',
        platform_name: 'oke',
      },
      platform_config: {
        extension: {
          type: 'needs_network',
          params: {},
        },
      },
    },
  ],
  naming: (import 'gen/naming.libsonnet')('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
  hub_has_spoke_natgw: true,
})
