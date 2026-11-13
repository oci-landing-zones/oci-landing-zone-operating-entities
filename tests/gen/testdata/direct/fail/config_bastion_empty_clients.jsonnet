// An empty Bastion client allowlist is not a deployable configuration.
// error_contains: config.bastion.client_cidr_block_allow_list must contain at least one value
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: { client_cidr_block_allow_list: [] },
})
