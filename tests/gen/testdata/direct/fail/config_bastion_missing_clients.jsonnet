// Enabling Bastion requires explicit approved client ranges.
// error_contains: config.bastion.client_cidr_block_allow_list is required
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: {},
})
