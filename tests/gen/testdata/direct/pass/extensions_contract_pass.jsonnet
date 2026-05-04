// extension resolution applies metadata defaults while preserving explicit subnet passthrough
local extensions = import 'gen/extensions.libsonnet';
local naming = import 'gen/naming.libsonnet';
local registry = {
  fake: {
    metadata(params):: {
      default_subnets: { app: '/25', db: '/25' },
      subnet_order: ['app', 'db'],
    },
    render(params):: {
      network_pre: {
        fake_network: {
          cidr: params.network.vcn,
          subnets: params.network.subnets,
        },
      },
      iam: {},
    },
  },
};
{
  explicit_metadata_and_render_phases:
    extensions.resolve({
      extension_registry: registry,
      extension_entries: [{
        scope: {
          scope_name: 'prod',
          platform_name: 'fake',
        },
        platform_config: {
          network: { vcn: '10.0.96.0/24', subnets: null },
          extension: { type: 'fake', params: {} },
        },
      }],
      naming: naming('fra'),
      hub_vcn_cidr: '10.0.0.0/21',
      routed_vcn_entries: [],
    }).network_pre.fake_network,

  explicit_extension_subnets_passthrough:
    extensions.resolve({
      extension_registry: registry,
      extension_entries: [{
        scope: {
          scope_name: 'prod',
          platform_name: 'fake',
        },
        platform_config: {
          network: {
            vcn: '10.0.96.0/24',
            subnets: {
              app: '10.0.96.0/25',
              db: '10.0.96.128/25',
            },
          },
          extension: { type: 'fake', params: {} },
        },
      }],
      naming: naming('fra'),
      hub_vcn_cidr: '10.0.0.0/21',
      routed_vcn_entries: [],
    }).network_pre.fake_network,
}
