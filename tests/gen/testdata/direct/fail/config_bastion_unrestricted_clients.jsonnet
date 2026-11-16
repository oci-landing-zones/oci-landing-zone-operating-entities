// Bastion cannot be exposed to every IPv4 client.
// error_contains: config.bastion.client_cidr_block_allow_list must not include 0.0.0.0/0
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: { client_cidr_block_allow_list: ['0.0.0.0/0'] },
})
