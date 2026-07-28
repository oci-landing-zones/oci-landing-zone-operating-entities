// Multi-OE topology uses normalized OE keys directly, with lexical OE and semantic environment ordering.
local config_lib = import 'gen/config.libsonnet';
local naming = import 'gen/naming.libsonnet';
local topology = import 'gen/topology.libsonnet';
local config = config_lib.normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    beta: {
      dns: 'bb',
      display_name: 'Beta Group',
      environments: { preprod: {}, prod: {} },
    },
    alpha: {
      dns: 'aa',
      environments: { dev: {}, prod: {} },
    },
  },
  security_targets: ['alpha-prod', 'beta-preprod'],
});
local topo = topology(config, naming(config.region_short_name));
{
  normalized_display_defaults: config.operating_entities.alpha.display_name,
  ordered_entries: [
    {
      mode: entry.mode,
      oe_name: entry.oe_name,
      oe_display_name: entry.oe_display_name,
      oe_dns: entry.oe_dns,
      env_name: entry.env_name,
      qualified_name: entry.qualified_name,
      key_segments: entry.key_segments,
      display_segments: entry.display_segments,
      name_segments: entry.name_segments,
      compartment_segments: entry.compartment_segments,
      dns_segments: entry.dns_segments,
    }
    for entry in topo.ordered_env_entries()
  ],
  security_targets: topo.security_target_env_names(),
}
