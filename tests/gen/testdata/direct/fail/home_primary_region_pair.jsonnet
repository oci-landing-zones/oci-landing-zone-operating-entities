// Primary topology region and naming metadata must be supplied together.
// error_contains: config.primary_region and config.primary_region_short_name must be provided together
(import 'gen/config.libsonnet').normalize({
  stack_scope: 'home', primary_region: 'eu-amsterdam-1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
})
