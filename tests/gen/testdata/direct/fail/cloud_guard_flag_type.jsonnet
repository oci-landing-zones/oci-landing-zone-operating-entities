// Cloud Guard activation must be a boolean.
// error_contains: config.enable_cloud_guard must be a boolean
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  enable_cloud_guard: 'false',
})
