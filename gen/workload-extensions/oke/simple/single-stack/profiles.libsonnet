local defaults = import '../../../../defaults.libsonnet';

local oke_platform = {
  network: { vcn: '10.0.80.0/21' },
  extension: {
    type: 'oke_simple',
    params: {
      kubernetes_version: 'v1.31.1',
      services_cidr: '10.96.0.0/16',
    },
  },
};

{
  single_stack: {
    config: defaults.hub_e + {
      environments+: {
        prod+: {
          platforms+: {
            oke: oke_platform,
          },
        },
      },
    },
  },
}
