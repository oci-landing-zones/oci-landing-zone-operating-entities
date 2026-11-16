// Bastion accepts at most twenty client CIDR entries.
// error_contains: config.bastion.client_cidr_block_allow_list must contain at most 20 values
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: { client_cidr_block_allow_list: ['203.0.113.%d/32' % i for i in std.range(1, 21)] },
})
