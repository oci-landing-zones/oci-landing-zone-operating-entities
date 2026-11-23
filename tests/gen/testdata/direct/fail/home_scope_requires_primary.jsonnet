// Home projection must identify the Primary topology whose IAM it owns.
// error_contains: config.stack_scope home requires primary_region and primary_region_short_name
(import 'gen/config.libsonnet').normalize({
  stack_scope: 'home', hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
})
