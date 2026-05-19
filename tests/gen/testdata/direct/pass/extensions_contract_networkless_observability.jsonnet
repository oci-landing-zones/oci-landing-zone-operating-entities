// networkless extensions can omit network, skip network_pre, and merge observability
local extensions = import 'gen/extensions.libsonnet';

local registry = {
  no_network_obs: {
    metadata(params):: {
      requires_network: false,
    },
    render(params):: {
      iam: { marker: { identity: true } },
      observability_cis1: { marker: { obs1: true } },
      observability_cis2: { marker: { obs2: true } },
    },
  },
};

local state = extensions.resolve({
  extension_registry: registry,
  extension_entries: [
    {
      scope: {
        scope_name: 'shared',
        platform_name: 'exacc',
      },
      platform_config: {
        extension: {
          type: 'no_network_obs',
          params: {},
        },
      },
    },
  ],
  naming: (import 'gen/naming.libsonnet')('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
  hub_has_spoke_natgw: true,
});

{
  iam_marker: state.iam.marker.identity,
  network_pre_empty: state.network_pre == {},
  observability_cis1_marker: state.observability_cis1.marker.obs1,
  observability_cis2_marker: state.observability_cis2.marker.obs2,
}
