// extension contract rejects renderers that omit required contributions
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';
local registry = {
  fake_missing: {
    metadata(params):: {
      default_subnets: { app: '/24' },
      subnet_order: ['app'],
    },
    render(params):: {
      iam: {},
    },
  },
};
extensions.resolve({
  extension_registry: registry,
  extension_entries: [{
    scope: {
      scope_name: 'prod',
      platform_name: 'fake',
    },
    platform_config: {
      network: { vcn: '10.0.96.0/24', subnets: null },
      extension: { type: 'fake_missing', params: {} },
    },
  }],
  naming: naming('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
})
