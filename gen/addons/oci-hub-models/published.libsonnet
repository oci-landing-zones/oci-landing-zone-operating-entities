local constants = import '../../constants.libsonnet';
local governance_builder = import '../../builders/governance.libsonnet';
local hub_common = import '../../hub/hub_common.libsonnet';
local iam_builder = import '../../builders/iam.libsonnet';
local cfg_lib = import '../../config.libsonnet';
local naming = import '../../naming.libsonnet';
local topology = import '../../topology.libsonnet';
local hub_builders = {
  hub_a: import '../../hub/hub_a.libsonnet',
  hub_b: import '../../hub/hub_b.libsonnet',
  hub_c: import '../../hub/hub_c.libsonnet',
  hub_e: import '../../hub/hub_e.libsonnet',
};

local render_context(config) =
  local normalized = cfg_lib.normalize(config);
  local n = naming(normalized.region_short_name);
  local topo = topology(normalized, n);
  local ordered_spoke_env_names = topo.ordered_spoke_env_names();
  local example_vcns = [
    {
      name: env_name,
      cidr: normalized.environments[env_name].shared_project_network.network.vcn,
    }
    for env_name in ordered_spoke_env_names
  ];
  local example_lb_backends =
    if std.length(ordered_spoke_env_names) > 0 then
      local first_spoke_env = normalized.environments[ordered_spoke_env_names[0]];
      local web_subnet = first_spoke_env.shared_project_network.network.subnets.web;
      {
        backend1_ip: hub_common.host_ip_from_subnet(web_subnet, 10),
        backend2_ip: hub_common.host_ip_from_subnet(web_subnet, 20),
      }
    else {
      backend1_ip: '0.0.0.0',
      backend2_ip: '0.0.0.0',
    };
  {
    normalized: normalized,
    n: n,
    realm_constants: constants[normalized.realm],
    example_vcns: example_vcns,
    example_lb_backends: example_lb_backends,
    // Addon IAM/governance outputs are shared-only and must not fan out
    // workload environments from the one-stack profile config.
    shared_only_config: normalized { environments: {} },
  };

{
  render(config)::
    local ctx = render_context(config);
    local hub = hub_builders[ctx.normalized.hub.kind](
      ctx.n,
      ctx.normalized.hub,
      ctx.example_vcns,
      ctx.example_lb_backends
    );
    {
      network:
        if hub.post != null then hub.pre + hub.post
        else hub.pre,

      [if hub.post != null then 'network_pre']: hub.pre,

      [if hub.post != null && std.objectHas(hub, 'backends') then 'network_backends']:
        hub.pre + hub.backends.build(
          'NETWORK FIREWALL-1 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrr...',
          'NETWORK FIREWALL-2 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrt...',
          'NETWORK FIREWALL-1 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsm...',
          'NETWORK FIREWALL-2 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsh...',
        ),
    },

  render_iam(config)::
    local ctx = render_context(config);
    local shared_only_topo = topology(ctx.shared_only_config, ctx.n);
    iam_builder(ctx.shared_only_config, ctx.n, ctx.realm_constants, shared_only_topo),

  render_governance(config)::
    local ctx = render_context(config);
    governance_builder(ctx.shared_only_config, ctx.n),
}
