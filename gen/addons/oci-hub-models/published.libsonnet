local governance_builder = import '../../builders/governance.libsonnet';
local iam_builder = import '../../builders/iam.libsonnet';
local render_context = import '../../render_context.libsonnet';
local topology = import '../../topology.libsonnet';
local hub_builders = {
  hub_a: import '../../hub/hub_a.libsonnet',
  hub_b: import '../../hub/hub_b.libsonnet',
  hub_c: import '../../hub/hub_c.libsonnet',
  hub_e: import '../../hub/hub_e.libsonnet',
};

{
  render(config)::
    local ctx = render_context.from_raw_config(config);
    local hub = hub_builders[ctx.config.hub.kind](
      ctx.n,
      ctx.config.hub,
      ctx.spoke_vcns,
      ctx.lb_backends
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
    local ctx = render_context.from_raw_config(config);
    local shared_only_topo = topology(ctx.shared_only_config, ctx.n);
    iam_builder(ctx.shared_only_config, ctx.n, ctx.realm_constants, shared_only_topo),

  render_governance(config)::
    local ctx = render_context.from_raw_config(config);
    governance_builder(ctx.shared_only_config, ctx.n),
}
