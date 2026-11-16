// Bastion configuration must be an object, not an enable flag.
// error_contains: config.bastion must be an object
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: true,
})
