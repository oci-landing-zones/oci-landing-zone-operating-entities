// Null roots are absent for exclusivity, and normalized OE keys are used without synthetic prefix changes.
local config_lib = import 'gen/config.libsonnet';
local naming = import 'gen/naming.libsonnet';
local topology = import 'gen/topology.libsonnet';
local one = config_lib.normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  operating_entities: null,
});
local multi = config_lib.normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: null,
  operating_entities: {
    oe_alpha: {
      dns: 'oa',
      environments: { prod: {} },
    },
  },
});
local one_topo = topology(one, naming(one.region_short_name));
local multi_topo = topology(multi, naming(multi.region_short_name));
{
  one_mode: one_topo.mode,
  multi_mode: multi_topo.mode,
  normalized_qualifier: multi_topo.ordered_env_entries()[0].qualified_name,
}
