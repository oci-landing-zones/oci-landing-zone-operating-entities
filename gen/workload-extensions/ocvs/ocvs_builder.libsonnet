local ocvs_configuration = import './ocvs_configuration.libsonnet';
local ocvs_context = import './ocvs_context.libsonnet';
local ocvs_iam = import './ocvs_iam.libsonnet';
local ocvs_network = import './ocvs_network.libsonnet';

{
  metadata(params)::
    local vcn_prefix = std.parseInt(std.split(params.platform_config.network.vcn, '/')[1]);
    assert std.member([21, 22, 23, 24], vcn_prefix) :
      'ocvs platform network.vcn prefix must be one of /21, /22, /23, /24';
    {
      network_mode: 'required',
      default_subnets: {
        provisioning: '/%d' % (vcn_prefix + 4),
      },
      subnet_order: ['provisioning'],
    },

  render(params)::
    local metadata = self.metadata(params);
    local ctx = ocvs_context.build(params, metadata);
    {
      metadata: metadata,
      contributions: {
        network_pre: ocvs_network(ctx),
        iam: ocvs_iam(ctx),
        ocvs: ocvs_configuration(ctx),
      },
    },
}
